use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

#[derive(Serialize)]
pub struct TtsVoice {
    name: String,
    locale: String,
}

fn unique_stamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|delta| delta.as_nanos())
        .unwrap_or(0)
}

fn parse_voice_line(line: &str) -> Option<TtsVoice> {
    let content = line.split('#').next().unwrap_or("").trim_end();
    if content.is_empty() {
        return None;
    }
    let (name, locale) = content.rsplit_once(char::is_whitespace)?;
    let name = name.trim();
    let locale = locale.trim();
    if name.is_empty() || locale.is_empty() {
        return None;
    }
    Some(TtsVoice {
        name: name.to_string(),
        locale: locale.to_string(),
    })
}

#[tauri::command]
pub fn list_tts_voices() -> Result<Vec<TtsVoice>, String> {
    let output = Command::new("say")
        .arg("-v")
        .arg("?")
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err("ttsUnavailable".to_string());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    Ok(text.lines().filter_map(parse_voice_line).collect())
}

#[tauri::command]
pub fn synthesize_tts(text: String, voice: String, file_name: String) -> Result<String, String> {
    if text.trim().is_empty() {
        return Err("emptyText".to_string());
    }

    let safe_name: String = file_name
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, '.' | '-' | '_'))
        .collect();
    let safe_name = if safe_name.to_lowercase().ends_with(".m4a") {
        safe_name
    } else {
        format!("{}.m4a", if safe_name.is_empty() { "tts-audio" } else { &safe_name })
    };

    let mut dir: PathBuf = std::env::temp_dir();
    dir.push(format!("asakiri-tts-{}", unique_stamp()));
    fs::create_dir_all(&dir).map_err(|_| "unknown".to_string())?;
    let target = dir.join(&safe_name);

    let mut command = Command::new("say");
    if !voice.trim().is_empty() {
        command.arg("-v").arg(&voice);
    }
    command.arg("-o").arg(&target).arg("--").arg(&text);

    let output = command.output().map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    if !target.exists() {
        return Err("ttsFailed".to_string());
    }

    target
        .to_str()
        .map(|path| path.to_string())
        .ok_or_else(|| "unknown".to_string())
}

#[cfg(test)]
mod tests {
    use super::parse_voice_line;

    #[test]
    fn parses_simple_voice() {
        let voice = parse_voice_line("Samantha            en_US    # Hello, my name is Samantha.")
            .expect("voice");
        assert_eq!(voice.name, "Samantha");
        assert_eq!(voice.locale, "en_US");
    }

    #[test]
    fn parses_name_with_spaces() {
        let voice =
            parse_voice_line("Eddy (English (US))  en_US    # Hi there!").expect("voice");
        assert_eq!(voice.name, "Eddy (English (US))");
        assert_eq!(voice.locale, "en_US");
    }

    #[test]
    fn ignores_blank_and_headerless_lines() {
        assert!(parse_voice_line("").is_none());
        assert!(parse_voice_line("   # only a comment").is_none());
    }
}
