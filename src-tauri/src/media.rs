use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;

const ALLOWED_HOSTS: &[&str] = &[
    "unsplash.com",
    "images.unsplash.com",
    "tatoeba.org",
    "audio.tatoeba.org",
];

const USER_AGENT: &str = "AsakiriStudio/0.1 (+media-search)";

fn host_allowed(url: &str) -> bool {
    let Some(rest) = url.strip_prefix("https://") else {
        return false;
    };
    let host = rest.split(['/', '?', '#']).next().unwrap_or("");
    ALLOWED_HOSTS.contains(&host)
}

fn unique_stamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|delta| delta.as_nanos())
        .unwrap_or(0)
}

#[tauri::command]
pub fn http_get_text(url: String) -> Result<String, String> {
    if !host_allowed(&url) {
        return Err("hostNotAllowed".to_string());
    }
    let response = ureq::get(&url)
        .set("User-Agent", USER_AGENT)
        .set("Accept", "application/json")
        .call()
        .map_err(|error| error.to_string())?;
    response.into_string().map_err(|error| error.to_string())
}

fn write_temp_file(file_name: &str, bytes: &[u8]) -> Result<String, String> {
    let safe_name: String = file_name
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, '.' | '-' | '_'))
        .collect();
    let safe_name = if safe_name.is_empty() {
        "recording".to_string()
    } else {
        safe_name
    };

    let mut dir: PathBuf = std::env::temp_dir();
    dir.push(format!("asakiri-media-{}", unique_stamp()));
    fs::create_dir_all(&dir).map_err(|_| "unknown".to_string())?;
    let target = dir.join(&safe_name);
    fs::write(&target, bytes).map_err(|_| "unknown".to_string())?;

    target
        .to_str()
        .map(|path| path.to_string())
        .ok_or_else(|| "unknown".to_string())
}

#[tauri::command]
pub fn write_temp_media(file_name: String, data_base64: String) -> Result<String, String> {
    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|_| "decodeFailed".to_string())?;
    if bytes.is_empty() {
        return Err("emptyRecording".to_string());
    }
    write_temp_file(&file_name, &bytes)
}

#[tauri::command]
pub fn download_media_file(url: String, file_name: String) -> Result<String, String> {
    if !host_allowed(&url) {
        return Err("hostNotAllowed".to_string());
    }
    let response = ureq::get(&url)
        .set("User-Agent", USER_AGENT)
        .call()
        .map_err(|error| error.to_string())?;

    let mut bytes: Vec<u8> = Vec::new();
    response
        .into_reader()
        .read_to_end(&mut bytes)
        .map_err(|_| "downloadFailed".to_string())?;

    let safe_name: String = file_name
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, '.' | '-' | '_'))
        .collect();
    let safe_name = if safe_name.is_empty() {
        "download".to_string()
    } else {
        safe_name
    };

    let mut dir: PathBuf = std::env::temp_dir();
    dir.push(format!("asakiri-media-{}", unique_stamp()));
    fs::create_dir_all(&dir).map_err(|_| "unknown".to_string())?;
    let target = dir.join(&safe_name);
    fs::write(&target, &bytes).map_err(|_| "unknown".to_string())?;

    target
        .to_str()
        .map(|path| path.to_string())
        .ok_or_else(|| "unknown".to_string())
}

#[derive(serde::Serialize)]
pub struct FolderFile {
    pub path: String,
    pub name: String,
}

const MAX_FOLDER_DEPTH: usize = 8;
const MAX_FOLDER_FILES: usize = 5000;

fn collect_files(dir: &std::path::Path, depth: usize, out: &mut Vec<FolderFile>) {
    if depth > MAX_FOLDER_DEPTH || out.len() >= MAX_FOLDER_FILES {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut sorted: Vec<_> = entries.filter_map(Result::ok).collect();
    sorted.sort_by_key(std::fs::DirEntry::file_name);
    for entry in sorted {
        if out.len() >= MAX_FOLDER_FILES {
            return;
        }
        let path = entry.path();
        let Ok(kind) = entry.file_type() else { continue };
        if kind.is_symlink() {
            continue;
        }
        if kind.is_dir() {
            collect_files(&path, depth + 1, out);
        } else if kind.is_file() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            out.push(FolderFile {
                path: path.to_string_lossy().to_string(),
                name,
            });
        }
    }
}

#[tauri::command]
pub fn list_folder_files(folder_path: String) -> Result<Vec<FolderFile>, String> {
    let root = PathBuf::from(&folder_path);
    if !root.is_dir() {
        return Err("notFound".to_string());
    }
    let mut out = Vec::new();
    collect_files(&root, 0, &mut out);
    Ok(out)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentTable {
    pub header_rows: usize,
    pub rows: Vec<Vec<String>>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadDocument {
    pub format: String,
    pub markdown: String,
    pub tables: Vec<DocumentTable>,
    pub image_count: usize,
}

fn cell_text(cell: &anydoc::model::Cell) -> String {
    cell.blocks
        .iter()
        .filter_map(|block| match block {
            anydoc::model::Block::Paragraph(inlines) => {
                Some(anydoc::model::inlines_to_plain_text(inlines))
            }
            anydoc::model::Block::Heading { content, .. } => {
                Some(anydoc::model::inlines_to_plain_text(content))
            }
            _ => None,
        })
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

fn data_tables(document: &anydoc::model::Document) -> Vec<DocumentTable> {
    document
        .blocks
        .iter()
        .filter_map(|block| match block {
            anydoc::model::Block::Table(table)
                if table.kind == anydoc::model::TableKind::Data =>
            {
                Some(DocumentTable {
                    header_rows: table.header_rows,
                    rows: table
                        .grid
                        .iter()
                        .map(|row| {
                            row.iter()
                                .map(|slot| match slot {
                                    anydoc::model::CellSlot::Origin(cell) => cell_text(cell),
                                    _ => String::new(),
                                })
                                .collect()
                        })
                        .collect(),
                })
            }
            _ => None,
        })
        .collect()
}

fn detect_format(path: &std::path::Path, bytes: &[u8]) -> Option<anydoc::Format> {
    anydoc::Format::from_bytes(bytes).or_else(|| {
        path.extension()
            .and_then(|value| value.to_str())
            .and_then(anydoc::Format::from_extension)
    })
}

#[tauri::command]
pub fn read_document(source_path: String) -> Result<ReadDocument, String> {
    let path = PathBuf::from(&source_path);
    if !path.is_file() {
        return Err("notFound".to_string());
    }
    let bytes = fs::read(&path).map_err(|_| "unreadable".to_string())?;
    let format = detect_format(&path, &bytes).ok_or_else(|| "unsupportedFormat".to_string())?;

    let document = anydoc::to_document(&bytes, Some(format))
        .map_err(|error| format!("convertFailed: {error}"))?;
    let markdown = anydoc::to_markdown_bytes(&bytes, Some(format))
        .map_err(|error| format!("convertFailed: {error}"))?;

    Ok(ReadDocument {
        format: format!("{format:?}").to_lowercase(),
        markdown,
        tables: data_tables(&document),
        image_count: document.assets.len(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const CSV: &[u8] = "Japanese,English\n\u{732b},cat\n\u{72ac},dog\n".as_bytes();

    #[test]
    fn allows_only_https_urls_on_known_hosts() {
        assert!(host_allowed("https://images.unsplash.com/photo-1?w=640"));
        assert!(host_allowed("https://tatoeba.org/audio/1.mp3"));
        assert!(!host_allowed("http://images.unsplash.com/photo-1"));
        assert!(!host_allowed("https://evil.example/images.unsplash.com"));
        assert!(!host_allowed("https://unsplash.com.evil.example/x"));
    }

    #[test]
    fn reads_a_spreadsheet_into_a_grid() {
        let format = anydoc::Format::from_extension("csv").unwrap();
        let document = anydoc::to_document(CSV, Some(format)).unwrap();
        let tables = data_tables(&document);

        assert_eq!(tables.len(), 1);
        assert_eq!(tables[0].header_rows, 1);
        assert_eq!(tables[0].rows[0], vec!["Japanese", "English"]);
        assert_eq!(tables[0].rows[1], vec!["\u{732b}", "cat"]);
    }

    #[test]
    fn falls_back_to_the_extension_when_bytes_do_not_identify_the_format() {
        assert!(anydoc::Format::from_bytes(CSV).is_none());
        assert!(detect_format(std::path::Path::new("vocab.csv"), CSV).is_some());
    }
}
