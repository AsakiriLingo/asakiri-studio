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
    use super::{slugify, validate_directory_name};

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
