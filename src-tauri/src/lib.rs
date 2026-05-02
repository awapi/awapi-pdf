use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder};
use tauri::Emitter;
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
        .setup(|app| {
            // Build the native menu bar with a Help → Check for Updates item.
            let check_updates_item = MenuItem::with_id(
                app,
                "check-for-updates",
                "Check for Updates",
                true,
                None::<&str>,
            )?;

            #[cfg(target_os = "macos")]
            {
                let app_submenu = SubmenuBuilder::new(app, "AwapiPDF")
                    .about(None)
                    .separator()
                    .services()
                    .separator()
                    .hide()
                    .hide_others()
                    .show_all()
                    .separator()
                    .quit()
                    .build()?;
                let file_submenu = SubmenuBuilder::new(app, "File")
                    .close_window()
                    .build()?;
                let edit_submenu = SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;
                let view_submenu = SubmenuBuilder::new(app, "View")
                    .fullscreen()
                    .build()?;
                let window_submenu = SubmenuBuilder::new(app, "Window")
                    .minimize()
                    .build()?;
                let help_submenu = SubmenuBuilder::new(app, "Help")
                    .item(&check_updates_item)
                    .build()?;
                let menu = MenuBuilder::new(app)
                    .items(&[
                        &app_submenu,
                        &file_submenu,
                        &edit_submenu,
                        &view_submenu,
                        &window_submenu,
                        &help_submenu,
                    ])
                    .build()?;
                app.set_menu(menu)?;
            }

            #[cfg(not(target_os = "macos"))]
            {
                let help_submenu = SubmenuBuilder::new(app, "Help")
                    .item(&check_updates_item)
                    .build()?;
                let menu = MenuBuilder::new(app)
                    .items(&[&help_submenu])
                    .build()?;
                app.set_menu(menu)?;
            }

            app.on_menu_event(|app_handle, event| {
                if event.id().0 == "check-for-updates" {
                    let _ = app_handle.emit("menu-check-for-updates", ());
                }
            });

            // On Windows (and Linux), file associations pass the file path as a
            // CLI argument rather than using the macOS/iOS RunEvent::Opened URL
            // mechanism. Capture it here so the frontend can retrieve it via
            // get_pending_file on mount.
            #[cfg(not(any(target_os = "macos", target_os = "ios")))]
            {
                let args: Vec<String> = std::env::args().collect();
                for arg in args.iter().skip(1) {
                    let path = std::path::Path::new(arg);
                    if path.exists()
                        && path
                            .extension()
                            .is_some_and(|e| e.eq_ignore_ascii_case("pdf"))
                    {
                        if let Some(path_str) = path.to_str() {
                            *app.state::<PendingFile>().0.lock().unwrap() =
                                Some(path_str.to_string());
                        }
                        break;
                    }
                }
            }
            Ok(())
        })
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
