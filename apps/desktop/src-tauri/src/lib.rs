use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct AppEnv {
    server_url: String,
    version: String,
}

#[tauri::command]
fn app_env() -> AppEnv {
    // DOKTORI_SERVER_URL can override the target server at build/run time.
    let server_url = std::env::var("DOKTORI_SERVER_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    AppEnv {
        server_url,
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![app_env])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
