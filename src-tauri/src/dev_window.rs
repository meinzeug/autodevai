use tauri::Window;

pub fn setup_dev_window(window: Window) {
    #[cfg(debug_assertions)]
    {
        window.open_devtools();
    }
}

pub fn configure_dev_environment(window: Window) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(debug_assertions)]
    {
        // Enable developer mode features
        window.set_always_on_top(false)?;
        window.set_resizable(true)?;
    }
    Ok(())
}
