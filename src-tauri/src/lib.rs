use std::sync::Mutex;
use tauri::Manager;

/// Holds file paths received before the frontend is ready.
struct PendingFile(Mutex<Option<String>>);

#[tauri::command]
fn get_pending_file(state: tauri::State<'_, PendingFile>) -> Option<String> {
    state.0.lock().unwrap().take()
}

/// Write PDF bytes to a temp file and open macOS's native print dialog via
/// Preview. This bypasses WKWebView's canvas print compositor, which renders
/// blank pages for canvas/rasterised content (known Apple WebKit limitation).
#[tauri::command]
fn print_pdf(bytes: Vec<u8>) -> Result<(), String> {
    let temp_path = std::env::temp_dir().join("awapi-print-temp.pdf");
    std::fs::write(&temp_path, &bytes).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let path_str = temp_path.to_string_lossy().to_string();
        // osascript tells Preview to open the file and show the print dialog.
        let script = format!(
            "tell application \"Preview\" to print POSIX file \"{}\" print dialog true",
            path_str
        );
        std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PendingFile(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![get_pending_file, print_pdf])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            if let tauri::RunEvent::Opened { urls } = &event {
                use tauri::Emitter;
                for url in urls {
                    if url.scheme() == "file" {
                        if let Ok(path) = url.to_file_path() {
                            let path_str = path.to_string_lossy().to_string();
                            // Always store as pending — frontend checks on mount
                            if let Some(state) = app_handle.try_state::<PendingFile>() {
                                *state.0.lock().unwrap() = Some(path_str.clone());
                            }
                            // Also emit in case the app is already running
                            let _ = app_handle.emit("open-file", &path_str);
                        }
                    }
                }
            }
            let _ = (&app_handle, &event);
        });
}
