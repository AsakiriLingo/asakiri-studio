mod course;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            course::create_course,
            course::read_course_title,
            course::write_course_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
