// Build script for AutoDev-AI Neural Bridge Platform
// Handles compilation, resource embedding, and build optimization

fn main() {
    // Standard Tauri build
    tauri_build::build();

    // Add build metadata
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", now);
    println!(
        "cargo:rustc-env=BUILD_PROFILE={}",
        std::env::var("PROFILE").unwrap_or_else(|_| "unknown".to_string())
    );

    // Git information (if available)
    if let Ok(output) = std::process::Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
    {
        if output.status.success() {
            let git_hash = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("cargo:rustc-env=GIT_HASH={}", git_hash);
        }
    }

    if let Ok(output) = std::process::Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
    {
        if output.status.success() {
            let git_branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("cargo:rustc-env=GIT_BRANCH={}", git_branch);
        }
    }

    // Check for required system dependencies
    check_system_dependencies();

    // Generate build configuration
    generate_build_config();
}

fn check_system_dependencies() {
    // Check for Docker
    if std::process::Command::new("docker")
        .arg("--version")
        .output()
        .is_ok()
    {
        println!("cargo:rustc-cfg=has_docker");
    }

    // Check for Node.js
    if std::process::Command::new("node")
        .arg("--version")
        .output()
        .is_ok()
    {
        println!("cargo:rustc-cfg=has_nodejs");
    }

    // Check for Git
    if std::process::Command::new("git")
        .arg("--version")
        .output()
        .is_ok()
    {
        println!("cargo:rustc-cfg=has_git");
    }
}

fn generate_build_config() {
    let config = format!(
        r#"{{
        "build_timestamp": "{}",
        "version": "{}",
        "target_triple": "{}",
        "features": []
    }}"#,
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        env!("CARGO_PKG_VERSION"),
        std::env::var("TARGET").unwrap_or_else(|_| "unknown".to_string())
    );

    let out_dir = std::env::var("OUT_DIR").unwrap();
    let config_path = std::path::Path::new(&out_dir).join("build_config.json");

    std::fs::write(config_path, config).expect("Failed to write build config");
}
