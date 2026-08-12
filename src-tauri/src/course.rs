use std::fs;
use std::path::Path;
use std::process::Command;

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedCourse {
    pub name: String,
    pub path: String,
    pub git_initialized: bool,
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

    let git_initialized = Command::new("git")
        .arg("init")
        .current_dir(&course_dir)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false);

    Ok(CreatedCourse {
        name: title.to_string(),
        path: course_dir.to_string_lossy().into_owned(),
        git_initialized,
    })
}

fn resolve_course_path(root_path: &str, relative_path: &str) -> Option<std::path::PathBuf> {
    let mut target = Path::new(root_path).to_path_buf();
    for segment in relative_path.split('/') {
        if segment.is_empty() || segment == "." || segment == ".." || segment.contains('\\') {
            return None;
        }
        target.push(segment);
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub initialized: bool,
    pub commit_count: u32,
    pub clean: bool,
}

#[tauri::command]
pub fn git_status(path: String) -> GitStatus {
    let dir = Path::new(&path);
    let is_repo = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(dir)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false);

    if !is_repo {
        return GitStatus {
            initialized: false,
            commit_count: 0,
            clean: true,
        };
    }

    let commit_count = Command::new("git")
        .args(["rev-list", "--count", "HEAD"])
        .current_dir(dir)
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .and_then(|text| text.trim().parse::<u32>().ok())
        .unwrap_or(0);

    let clean = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(dir)
        .output()
        .map(|output| output.stdout.is_empty())
        .unwrap_or(false);

    GitStatus {
        initialized: true,
        commit_count,
        clean,
    }
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
        copy_course_file, delete_course_file, read_course_file_base64, remove_course_dir,
        resolve_course_path, slugify, validate_directory_name, write_course_file,
    };

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
