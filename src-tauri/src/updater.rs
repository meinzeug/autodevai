
pub async fn check_for_updates(app: tauri::AppHandle) {
    #[cfg(feature = "updater")]
    {
        match app.updater().check().await {
            Ok(update) => {
                if update.is_update_available() {
                    println!("Update available: {}", update.latest_version());
                }
            }
            Err(e) => {
                eprintln!("Failed to check for updates: {}", e);
            }
        }
    }
}

pub async fn download_and_install_update(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(feature = "updater")]
    {
        app.updater()
            .download_and_install()
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
