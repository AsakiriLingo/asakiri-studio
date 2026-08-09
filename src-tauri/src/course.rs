use std::fs;
use std::path::Path;
use std::process::Command;

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
    use super::{resolve_course_path, slugify, validate_directory_name, write_course_file};

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
