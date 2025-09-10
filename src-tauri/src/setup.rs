use tauri::App;

pub fn setup_handler<R: tauri::Runtime>(app: &App<R>) -> Result<(), Box<dyn std::error::Error>> {
    ensure_workspace_exists()?;
    configure_app_directories(app)?;
    initialize_logging()?;
    Ok(())
}

fn ensure_workspace_exists() -> Result<(), Box<dyn std::error::Error>> {
    let workspace_dir = std::env::current_dir()?.join("workspace");
    if !workspace_dir.exists() {
        std::fs::create_dir_all(&workspace_dir)?;
    }
    Ok(())
}

fn configure_app_directories<R: tauri::Runtime>(
    app: &App<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app
        .path_resolver()
        .app_data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap().join("app_data"));

    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir)?;
    }

    Ok(())
}

fn initialize_logging() -> Result<(), Box<dyn std::error::Error>> {
    // Logging is already initialized in main.rs
    Ok(())
}
