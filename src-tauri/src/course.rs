use std::fs;
use std::path::Path;
use std::process::Command;
use sha2::{Digest, Sha256};

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedCourse {
    pub name: String,
    pub path: String,
}

fn slugify(name: &str) -> String {
    let mut slug = String::new();
    for character in name.trim().chars() {
        if character.is_alphanumeric() {
            slug.extend(character.to_lowercase());
        } else if !slug.ends_with('_') && !slug.is_empty() {
            slug.push('_');
        }
    }
    while slug.ends_with('_') {
        slug.pop();
    }
    slug
}

fn is_reserved_windows_name(name: &str) -> bool {
    let stem = name.split('.').next().unwrap_or(name).to_ascii_uppercase();
    let numbered_device = stem
        .strip_prefix("COM")
        .or_else(|| stem.strip_prefix("LPT"));
    matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || numbered_device.is_some_and(|number| matches!(number.as_bytes(), [b'1'..=b'9']))
}

fn validate_directory_name(name: &str) -> Option<&str> {
    let title = name.trim();
    if title.is_empty()
        || matches!(title, "." | "..")
        || title.ends_with('.')
        || is_reserved_windows_name(title)
        || title
            .chars()
            .any(|character| character.is_control() || "<>:\"/\\|?*".contains(character))
    {
        return None;
    }

    Some(title)
}

#[derive(Deserialize)]
struct CourseManifest {
    project: CourseProject,
}

#[derive(Deserialize)]
struct CourseProject {
    title: String,
}

#[tauri::command]
pub fn create_course(parent_path: String, name: String) -> Result<CreatedCourse, String> {
    let title = validate_directory_name(&name).ok_or_else(|| "invalidName".to_string())?;

    let slug = slugify(title);
    let project_id = if slug.is_empty() {
        "course".to_string()
    } else {
        format!("course_{slug}")
    };

    let course_dir = Path::new(&parent_path).join(title);
    if course_dir.exists() {
        return Err("alreadyExists".into());
    }

    fs::create_dir_all(&course_dir).map_err(|_| "unknown".to_string())?;

    let manifest = serde_json::json!({
        "format": "asakiri-course",
        "formatVersion": "0.1",
        "project": {
            "id": project_id,
            "title": title,
            "description": "",
            "defaultLocale": "en",
            "learningLocales": []
        },
        "collections": [],
        "assets": [],
        "lessons": [],
        "outline": []
    });
    let manifest_text =
        serde_json::to_string_pretty(&manifest).map_err(|_| "unknown".to_string())?;
    fs::write(course_dir.join("project.json"), manifest_text).map_err(|_| "unknown".to_string())?;

    Ok(CreatedCourse {
        name: title.to_string(),
        path: course_dir.to_string_lossy().into_owned(),
    })
}

pub(crate) fn resolve_course_path(root_path: &str, relative_path: &str) -> Option<std::path::PathBuf> {
    let root = Path::new(root_path);
    let mut target = root.to_path_buf();
    for segment in relative_path.split('/') {
        if segment.is_empty() || segment == "." || segment == ".." || segment.contains('\\') {
            return None;
        }
        target.push(segment);
    }

    let Ok(canonical_root) = root.canonicalize() else {
        return Some(target);
    };
    let mut probe = target.as_path();
    while probe != root {
        if probe.symlink_metadata().is_ok() {
            let Ok(canonical) = probe.canonicalize() else {
                return None;
            };
            if canonical.starts_with(&canonical_root) {
                return Some(target);
            }
            return None;
        }
        probe = probe.parent()?;
    }
    Some(target)
}

#[tauri::command]
pub fn write_course_file(
    root_path: String,
    relative_path: String,
    contents: String,
) -> Result<(), String> {
    let target =
        resolve_course_path(&root_path, &relative_path).ok_or_else(|| "invalidPath".to_string())?;

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|_| "unknown".to_string())?;
    }
    fs::write(&target, contents).map_err(|_| "unknown".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_course_file(root_path: String, relative_path: String) -> Result<(), String> {
    let target =
        resolve_course_path(&root_path, &relative_path).ok_or_else(|| "invalidPath".to_string())?;

    match fs::remove_file(&target) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err("unknown".to_string()),
    }
}

/// Copies an arbitrary absolute file (e.g. one the user picked) into the project
/// at a guarded, project-relative destination, creating parent directories.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDigest {
    pub sha256: String,
    pub byte_size: u64,
}

#[tauri::command]
pub fn hash_course_file(root_path: String, relative_path: String) -> Result<FileDigest, String> {
    let target =
        resolve_course_path(&root_path, &relative_path).ok_or_else(|| "invalidPath".to_string())?;

    let bytes = fs::read(&target).map_err(|error| match error.kind() {
        std::io::ErrorKind::NotFound => "notFound".to_string(),
        _ => "unknown".to_string(),
    })?;

    let mut hasher = Sha256::new();
    hasher.update(&bytes);

    Ok(FileDigest {
        sha256: format!("{:x}", hasher.finalize()),
        byte_size: bytes.len() as u64,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DigestRequest {
    pub asset_path: String,
    pub binary_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DigestResult {
    pub asset_path: String,
    pub sha256: String,
    pub byte_size: u64,
}

#[tauri::command]
pub fn backfill_asset_digests(
    root_path: String,
    requests: Vec<DigestRequest>,
) -> Result<Vec<DigestResult>, String> {
    let mut results = Vec::new();
    for request in &requests {
        let Some(binary) = resolve_course_path(&root_path, &request.binary_path) else {
            continue;
        };
        let Ok(bytes) = fs::read(&binary) else {
            continue;
        };
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        let sha256 = format!("{:x}", hasher.finalize());
        let byte_size = bytes.len() as u64;

        let Some(asset_file) = resolve_course_path(&root_path, &request.asset_path) else {
            continue;
        };
        let Ok(text) = fs::read_to_string(&asset_file) else {
            continue;
        };
        let Ok(mut value) = serde_json::from_str::<serde_json::Value>(&text) else {
            continue;
        };
        let Some(object) = value.as_object_mut() else {
            continue;
        };
        object.insert("sha256".to_string(), serde_json::Value::String(sha256.clone()));
        object.insert("byteSize".to_string(), serde_json::json!(byte_size));
        let Ok(serialized) = serde_json::to_string_pretty(&value) else {
            continue;
        };
        if fs::write(&asset_file, format!("{serialized}\n")).is_err() {
            continue;
        }
        results.push(DigestResult {
            asset_path: request.asset_path.clone(),
            sha256,
            byte_size,
        });
    }
    Ok(results)
}

#[tauri::command]
pub fn copy_course_file(
    root_path: String,
    relative_path: String,
    source_path: String,
) -> Result<(), String> {
    let target =
        resolve_course_path(&root_path, &relative_path).ok_or_else(|| "invalidPath".to_string())?;

    let source = Path::new(&source_path);
    if !source.is_file() {
        return Err("notFound".to_string());
    }

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|_| "unknown".to_string())?;
    }
    fs::copy(source, &target).map(|_| ()).map_err(|_| "unknown".to_string())
}

#[tauri::command]
pub fn rename_course_file(
    root_path: String,
    from_relative_path: String,
    to_relative_path: String,
) -> Result<(), String> {
    let from = resolve_course_path(&root_path, &from_relative_path)
        .ok_or_else(|| "invalidPath".to_string())?;
    let to =
        resolve_course_path(&root_path, &to_relative_path).ok_or_else(|| "invalidPath".to_string())?;

    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|_| "unknown".to_string())?;
    }
    fs::rename(&from, &to).map_err(|_| "unknown".to_string())
}

/// Removes EXIF metadata (camera, GPS, timestamps) from image bytes without
/// re-encoding the pixels. Returns `None` for formats img-parts does not handle,
/// so the caller can fall back to a verbatim copy.
fn strip_image_metadata(bytes: &[u8]) -> Option<Vec<u8>> {
    use img_parts::{Bytes, DynImage, ImageEXIF};

    let mut image = DynImage::from_bytes(Bytes::copy_from_slice(bytes)).ok()??;
    image.set_exif(None);
    let mut out: Vec<u8> = Vec::new();
    image.encoder().write_to(&mut out).ok()?;
    Some(out)
}

/// Like `copy_course_file`, but strips image metadata on the way in. Used when
/// importing images so photos do not carry EXIF (including GPS) into the course.
#[tauri::command]
pub fn copy_course_image_stripped(
    root_path: String,
    relative_path: String,
    source_path: String,
) -> Result<(), String> {
    let target =
        resolve_course_path(&root_path, &relative_path).ok_or_else(|| "invalidPath".to_string())?;

    let source = Path::new(&source_path);
    if !source.is_file() {
        return Err("notFound".to_string());
    }

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|_| "unknown".to_string())?;
    }
    let bytes = fs::read(source).map_err(|_| "unknown".to_string())?;
    // Unrecognized formats (e.g. SVG) fall through to the original bytes.
    let output = strip_image_metadata(&bytes).unwrap_or(bytes);
    fs::write(&target, output).map_err(|_| "unknown".to_string())
}

/// Reads a project file and returns its bytes base64-encoded, for building a
/// `data:` URL to preview media inside the webview.
#[tauri::command]
pub fn read_course_file_base64(root_path: String, relative_path: String) -> Result<String, String> {
    let target =
        resolve_course_path(&root_path, &relative_path).ok_or_else(|| "invalidPath".to_string())?;

    match fs::read(&target) {
        Ok(bytes) => Ok(STANDARD.encode(bytes)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Err("notFound".to_string()),
        Err(_) => Err("unknown".to_string()),
    }
}

#[tauri::command]
pub fn read_course_file(root_path: String, relative_path: String) -> Result<String, String> {
    let target =
        resolve_course_path(&root_path, &relative_path).ok_or_else(|| "invalidPath".to_string())?;

    match fs::read_to_string(&target) {
        Ok(contents) => Ok(contents),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Err("notFound".to_string()),
        Err(_) => Err("unknown".to_string()),
    }
}

/// Recursively removes a project-relative directory. Missing is treated as success.
#[tauri::command]
pub fn remove_course_dir(root_path: String, relative_path: String) -> Result<(), String> {
    let target =
        resolve_course_path(&root_path, &relative_path).ok_or_else(|| "invalidPath".to_string())?;

    match fs::remove_dir_all(&target) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err("unknown".to_string()),
    }
}

#[tauri::command]
pub fn reveal_path(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err("notFound".to_string());
    }

    #[cfg(target_os = "macos")]
    let program = "open";
    #[cfg(target_os = "windows")]
    let program = "explorer";
    #[cfg(all(unix, not(target_os = "macos")))]
    let program = "xdg-open";

    Command::new(program)
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|_| "unknown".to_string())
}

#[tauri::command]
pub fn read_course_title(path: String) -> Result<String, String> {
    let manifest_text =
        fs::read_to_string(Path::new(&path).join("project.json")).map_err(|_| "unknown")?;
    let manifest: CourseManifest = serde_json::from_str(&manifest_text).map_err(|_| "unknown")?;
    let title = manifest.project.title.trim();
    if title.is_empty() {
        return Err("unknown".into());
    }

    Ok(title.to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        copy_course_file, copy_course_image_stripped, delete_course_file, read_course_file_base64,
        remove_course_dir, resolve_course_path, slugify, strip_image_metadata,
        validate_directory_name, write_course_file,
    };
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    #[test]
    fn deletes_a_file_and_treats_missing_as_success() {
        let root = std::env::temp_dir().join(format!("asakiri_delete_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let root_string = root.to_string_lossy().into_owned();

        write_course_file(root_string.clone(), "content/records/x.json".to_string(), "{}".to_string())
            .unwrap();
        assert!(root.join("content/records/x.json").exists());

        assert_eq!(
            delete_course_file(root_string.clone(), "content/records/x.json".to_string()),
            Ok(())
        );
        assert!(!root.join("content/records/x.json").exists());
        // Deleting again (now missing) still succeeds.
        assert_eq!(
            delete_course_file(root_string, "content/records/x.json".to_string()),
            Ok(())
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn writes_a_nested_file_and_creates_parent_dirs() {
        let root = std::env::temp_dir().join(format!("asakiri_write_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);

        let result = write_course_file(
            root.to_string_lossy().into_owned(),
            "content/records/new.json".to_string(),
            "{\"id\":\"x\"}".to_string(),
        );

        assert_eq!(result, Ok(()));
        let written = std::fs::read_to_string(root.join("content/records/new.json")).unwrap();
        assert_eq!(written, "{\"id\":\"x\"}");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn copies_a_picked_file_into_the_project() {
        let root = std::env::temp_dir().join(format!("asakiri_copy_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let source = std::env::temp_dir().join(format!("asakiri_src_{}.svg", std::process::id()));
        std::fs::write(&source, "<svg/>").unwrap();

        let result = copy_course_file(
            root.to_string_lossy().into_owned(),
            "media/assets/a1/original.svg".to_string(),
            source.to_string_lossy().into_owned(),
        );

        assert_eq!(result, Ok(()));
        let copied = std::fs::read_to_string(root.join("media/assets/a1/original.svg")).unwrap();
        assert_eq!(copied, "<svg/>");

        // A missing source is reported, not silently ignored.
        assert_eq!(
            copy_course_file(
                root.to_string_lossy().into_owned(),
                "media/assets/a1/missing.svg".to_string(),
                std::env::temp_dir().join("asakiri_nope.svg").to_string_lossy().into_owned(),
            ),
            Err("notFound".to_string())
        );

        let _ = std::fs::remove_file(&source);
        let _ = std::fs::remove_dir_all(&root);
    }

    // A valid 1x1 RGB PNG (correct chunk CRCs), with no metadata.
    const TINY_PNG_BASE64: &str =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

    #[test]
    fn strips_image_metadata_and_keeps_a_valid_png() {
        let png = STANDARD.decode(TINY_PNG_BASE64).unwrap();
        let stripped = strip_image_metadata(&png).expect("png should be recognized");
        // Still a PNG (signature intact), just re-serialized without any EXIF.
        assert_eq!(&stripped[0..8], &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    }

    #[test]
    fn returns_none_for_formats_it_cannot_parse() {
        assert_eq!(strip_image_metadata(b"<svg xmlns=\"...\"></svg>"), None);
    }

    #[test]
    fn imports_a_stripped_image_and_copies_unknown_formats_verbatim() {
        let root = std::env::temp_dir().join(format!("asakiri_strip_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let root_string = root.to_string_lossy().into_owned();

        // An SVG is not a raster format, so it is copied byte-for-byte.
        let svg = std::env::temp_dir().join(format!("asakiri_logo_{}.svg", std::process::id()));
        std::fs::write(&svg, "<svg/>").unwrap();
        copy_course_image_stripped(
            root_string.clone(),
            "media/assets/a1/logo.svg".to_string(),
            svg.to_string_lossy().into_owned(),
        )
        .unwrap();
        assert_eq!(
            std::fs::read_to_string(root.join("media/assets/a1/logo.svg")).unwrap(),
            "<svg/>"
        );

        // A real PNG is rewritten (metadata stripped) but stays a valid PNG.
        let png_path = std::env::temp_dir().join(format!("asakiri_pic_{}.png", std::process::id()));
        std::fs::write(&png_path, STANDARD.decode(TINY_PNG_BASE64).unwrap()).unwrap();
        copy_course_image_stripped(
            root_string.clone(),
            "media/assets/a2/pic.png".to_string(),
            png_path.to_string_lossy().into_owned(),
        )
        .unwrap();
        let written = std::fs::read(root.join("media/assets/a2/pic.png")).unwrap();
        assert_eq!(&written[0..8], &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

        assert_eq!(
            copy_course_image_stripped(
                root_string,
                "media/assets/a3/missing.png".to_string(),
                std::env::temp_dir().join("asakiri_absent.png").to_string_lossy().into_owned(),
            ),
            Err("notFound".to_string())
        );

        let _ = std::fs::remove_file(&svg);
        let _ = std::fs::remove_file(&png_path);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn reads_a_file_as_base64_and_reports_missing() {
        let root = std::env::temp_dir().join(format!("asakiri_b64_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);

        write_course_file(
            root.to_string_lossy().into_owned(),
            "media/assets/a1/original.svg".to_string(),
            "hi".to_string(),
        )
        .unwrap();

        // "hi" base64-encodes to "aGk=".
        assert_eq!(
            read_course_file_base64(
                root.to_string_lossy().into_owned(),
                "media/assets/a1/original.svg".to_string(),
            ),
            Ok("aGk=".to_string())
        );
        assert_eq!(
            read_course_file_base64(
                root.to_string_lossy().into_owned(),
                "media/assets/a1/missing.svg".to_string(),
            ),
            Err("notFound".to_string())
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn removes_an_asset_directory_and_treats_missing_as_success() {
        let root = std::env::temp_dir().join(format!("asakiri_rmdir_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);

        write_course_file(
            root.to_string_lossy().into_owned(),
            "media/assets/a1/asset.json".to_string(),
            "{}".to_string(),
        )
        .unwrap();
        assert!(root.join("media/assets/a1").exists());

        assert_eq!(
            remove_course_dir(root.to_string_lossy().into_owned(), "media/assets/a1".to_string()),
            Ok(())
        );
        assert!(!root.join("media/assets/a1").exists());
        // Removing again (now missing) still succeeds.
        assert_eq!(
            remove_course_dir(root.to_string_lossy().into_owned(), "media/assets/a1".to_string()),
            Ok(())
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn refuses_to_write_outside_the_course_directory() {
        let root = std::env::temp_dir().join(format!("asakiri_guard_{}", std::process::id()));
        let result =
            write_course_file(root.to_string_lossy().into_owned(), "../escape.json".to_string(), "{}".to_string());

        assert_eq!(result, Err("invalidPath".to_string()));
        assert!(!root.join("../escape.json").exists());
    }

    #[test]
    fn resolves_a_project_relative_path_under_the_root() {
        let resolved = resolve_course_path("/courses/japanese", "content/records/cat.json");
        assert_eq!(
            resolved,
            Some(std::path::PathBuf::from(
                "/courses/japanese/content/records/cat.json"
            ))
        );
    }

    #[test]
    fn rejects_paths_that_escape_the_course_directory() {
        assert_eq!(resolve_course_path("/courses/japanese", "../secrets.json"), None);
        assert_eq!(resolve_course_path("/courses/japanese", "a/../../b.json"), None);
        assert_eq!(resolve_course_path("/courses/japanese", "a\\b.json"), None);
        assert_eq!(resolve_course_path("/courses/japanese", ""), None);
    }

    #[cfg(unix)]
    #[test]
    fn rejects_a_symlinked_directory_that_escapes_the_course() {
        let outside = std::env::temp_dir().join(format!("asakiri_outside_{}", std::process::id()));
        let root = std::env::temp_dir().join(format!("asakiri_symdir_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&outside);
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&outside).unwrap();
        std::fs::create_dir_all(&root).unwrap();
        std::os::unix::fs::symlink(&outside, root.join("media")).unwrap();

        let result = write_course_file(
            root.to_string_lossy().into_owned(),
            "media/escape.json".to_string(),
            "{}".to_string(),
        );

        assert_eq!(result, Err("invalidPath".to_string()));
        assert!(!outside.join("escape.json").exists());

        let _ = std::fs::remove_dir_all(&outside);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[cfg(unix)]
    #[test]
    fn rejects_a_symlinked_file_that_escapes_the_course() {
        let outside_file =
            std::env::temp_dir().join(format!("asakiri_target_{}.json", std::process::id()));
        let root = std::env::temp_dir().join(format!("asakiri_symfile_{}", std::process::id()));
        let _ = std::fs::remove_file(&outside_file);
        let _ = std::fs::remove_dir_all(&root);
        std::fs::write(&outside_file, "original").unwrap();
        std::fs::create_dir_all(&root).unwrap();
        std::os::unix::fs::symlink(&outside_file, root.join("project.json")).unwrap();

        let result = write_course_file(
            root.to_string_lossy().into_owned(),
            "project.json".to_string(),
            "{}".to_string(),
        );

        assert_eq!(result, Err("invalidPath".to_string()));
        assert_eq!(std::fs::read_to_string(&outside_file).unwrap(), "original");

        let _ = std::fs::remove_file(&outside_file);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[cfg(unix)]
    #[test]
    fn rejects_a_dangling_symlink_inside_the_course() {
        let root = std::env::temp_dir().join(format!("asakiri_dangling_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let missing = std::env::temp_dir().join(format!("asakiri_missing_{}.json", std::process::id()));
        let _ = std::fs::remove_file(&missing);
        std::os::unix::fs::symlink(&missing, root.join("notes.json")).unwrap();

        let result = write_course_file(
            root.to_string_lossy().into_owned(),
            "notes.json".to_string(),
            "{}".to_string(),
        );

        assert_eq!(result, Err("invalidPath".to_string()));
        assert!(!missing.exists());

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn still_writes_inside_an_existing_course_directory() {
        let root = std::env::temp_dir().join(format!("asakiri_inside_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("content")).unwrap();

        let result = write_course_file(
            root.to_string_lossy().into_owned(),
            "content/records/new.json".to_string(),
            "{}".to_string(),
        );

        assert_eq!(result, Ok(()));
        assert!(root.join("content/records/new.json").exists());

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn preserves_course_name_for_the_directory() {
        assert_eq!(
            validate_directory_name("  Japanese Starter  "),
            Some("Japanese Starter")
        );
    }

    #[test]
    fn creates_unicode_identifiers() {
        assert_eq!(slugify("日本語 入門"), "日本語_入門");
    }

    #[test]
    fn rejects_names_that_cannot_be_portable_directories() {
        assert_eq!(validate_directory_name("Course/One"), None);
        assert_eq!(validate_directory_name("CON"), None);
        assert_eq!(validate_directory_name(".."), None);
    }
}
