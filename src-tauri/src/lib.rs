mod course;
mod media;
mod packaging;
mod process;
mod tts;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(window::WindowState::default())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_decorum::init())
        .menu(|handle| {
            use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
            let new_window = MenuItemBuilder::with_id("new-window", "New Window")
                .accelerator("CmdOrCtrl+Shift+N")
                .build(handle)?;
            let preferences = MenuItemBuilder::with_id("preferences", "Preferences…")
                .accelerator("CmdOrCtrl+,")
                .build(handle)?;
            let app_menu = SubmenuBuilder::new(handle, "Asakiri Studio")
                .about(None)
                .separator()
                .quit()
                .build()?;
            let file_menu = SubmenuBuilder::new(handle, "File")
                .item(&new_window)
                .separator()
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
            let window_menu = SubmenuBuilder::new(handle, "Window")
                .minimize()
                .maximize()
                .separator()
                .fullscreen()
                .build()?;
            #[cfg(target_os = "macos")]
            let _ = window_menu.set_as_windows_menu_for_nsapp();
            MenuBuilder::new(handle)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&window_menu)
                .build()
        })
        .on_menu_event(|app, event| {
            use tauri::Emitter;
            match event.id().as_ref() {
                "preferences" => {
                    let _ = app.emit("open-preferences", ());
                }
                "new-window" => {
                    let _ = window::open_course_window(app);
                }
                _ => {}
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                window::forget_window(window);
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
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                use tauri_plugin_decorum::WebviewWindowExt;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_traffic_lights_inset(16.0, 28.0);
                }
            }
            #[cfg(not(any(target_os = "windows", target_os = "macos")))]
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
            course::backfill_asset_digests,
            course::copy_course_image_stripped,
            course::rename_course_file,
            course::read_course_file_base64,
            course::read_course_file,
            course::remove_course_dir,
            course::reveal_path,
            media::http_get_text,
            media::download_media_file,
            media::write_temp_media,
            media::list_folder_files,
            media::read_document,
            packaging::write_stored_zip,
            packaging::write_release_state,
            packaging::read_release_state,
            tts::list_tts_voices,
            tts::synthesize_tts,
            tts::preview_tts,
            tts::list_available_voices,
            tts::download_voice,
            tts::remove_voice,
            window::set_window_course,
            window::focus_course_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
