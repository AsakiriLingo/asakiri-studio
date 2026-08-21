mod course;
mod media;
mod tts;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .menu(|handle| {
            use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
            let preferences = MenuItemBuilder::with_id("preferences", "Preferences…")
                .accelerator("CmdOrCtrl+,")
                .build(handle)?;
            let app_menu = SubmenuBuilder::new(handle, "Asakiri Studio")
                .about(None)
                .separator()
                .quit()
                .build()?;
            let file_menu = SubmenuBuilder::new(handle, "File")
                .item(&preferences)
                .separator()
                .close_window()
                .build()?;
            let edit_menu = SubmenuBuilder::new(handle, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            MenuBuilder::new(handle)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .build()
        })
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "preferences" {
                use tauri::Emitter;
                let _ = app.emit("open-preferences", ());
            }
        });

    builder
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.maximize();
                }
            }
            #[cfg(not(target_os = "windows"))]
            let _ = app;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            course::create_course,
            course::read_course_title,
            course::write_course_file,
            course::delete_course_file,
            course::copy_course_file,
            course::hash_course_file,
            course::copy_course_image_stripped,
            course::rename_course_file,
            course::read_course_file_base64,
            course::remove_course_dir,
            course::reveal_path,
            course::git_status,
            media::http_get_text,
            media::download_media_file,
            media::write_temp_media,
            media::list_folder_files,
            media::read_document,
            tts::list_tts_voices,
            tts::synthesize_tts,
            tts::preview_tts,
            tts::list_available_voices,
            tts::download_voice,
            tts::remove_voice
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
