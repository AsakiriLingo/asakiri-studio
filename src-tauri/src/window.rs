use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

#[derive(Default)]
pub struct WindowState {
    courses: Mutex<HashMap<String, String>>,
    counter: AtomicU32,
}

#[tauri::command]
pub fn set_window_course(
    window: WebviewWindow,
    state: tauri::State<'_, WindowState>,
    path: Option<String>,
) {
    let mut courses = match state.courses.lock() {
        Ok(courses) => courses,
        Err(poisoned) => poisoned.into_inner(),
    };
    match path {
        Some(path) => {
            courses.insert(window.label().to_string(), path);
        }
        None => {
            courses.remove(window.label());
        }
    }
}

#[tauri::command]
pub fn focus_course_window(
    window: WebviewWindow,
    app: AppHandle,
    state: tauri::State<'_, WindowState>,
    path: String,
) -> bool {
    let target_label = {
        let courses = match state.courses.lock() {
            Ok(courses) => courses,
            Err(poisoned) => poisoned.into_inner(),
        };
        courses
            .iter()
            .find(|(label, open_path)| {
                label.as_str() != window.label() && open_path.as_str() == path
            })
            .map(|(label, _)| label.clone())
    };

    if let Some(label) = target_label {
        if let Some(target) = app.get_webview_window(&label) {
            let _ = target.unminimize();
            let _ = target.set_focus();
            return true;
        }
    }

    false
}

pub fn forget_window(window: &tauri::Window) {
    let state = window.state::<WindowState>();
    let mut courses = match state.courses.lock() {
        Ok(courses) => courses,
        Err(poisoned) => poisoned.into_inner(),
    };
    courses.remove(window.label());
}

pub fn open_course_window(app: &AppHandle) -> tauri::Result<()> {
    let state = app.state::<WindowState>();
    let next = state.counter.fetch_add(1, Ordering::Relaxed) + 1;
    let label = format!("window-{next}");

    let builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("Asakiri Studio")
        .inner_size(1280.0, 720.0)
        .min_inner_size(1024.0, 600.0)
        .center();

    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);

    let window = builder.build()?;

    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_decorum::WebviewWindowExt;
        let _ = window.set_traffic_lights_inset(16.0, 28.0);
    }

    #[cfg(target_os = "windows")]
    let _ = window.maximize();

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let _ = window;

    Ok(())
}
