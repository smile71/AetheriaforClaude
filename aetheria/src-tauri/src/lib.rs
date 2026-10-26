use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use serde_json::{json, Value};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::ipc::Response;
use tauri::Manager;

struct Discord(Mutex<Option<(String, DiscordIpcClient)>>);

fn nonce() -> String {
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("aeth-{}", n)
}

#[tauri::command]
async fn fetch_bytes(url: String) -> Result<Response, String> {
    let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    Ok(Response::new(bytes.to_vec()))
}

#[tauri::command]
async fn discord_set(
    state: tauri::State<'_, Discord>,
    client_id: String,
    activity: Value,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let need_new = match guard.as_ref() {
        Some((id, _)) => *id != client_id,
        None => true,
    };
    if need_new {
        if let Some((_, mut old)) = guard.take() {
            let _ = old.close();
        }
        let mut c = DiscordIpcClient::new(&client_id).map_err(|e| e.to_string())?;
        c.connect().map_err(|e| e.to_string())?;
        *guard = Some((client_id.clone(), c));
    }

    let data = json!({
        "cmd": "SET_ACTIVITY",
        "args": { "pid": std::process::id(), "activity": activity },
        "nonce": nonce()
    });

    let res = {
        let (_, c) = guard.as_mut().unwrap();
        c.send(data, 1).and_then(|_| c.recv().map(|_| ()))
    };
    if let Err(e) = res {
        *guard = None;
        return Err(e.to_string());
    }
    Ok(())
}

#[tauri::command]
async fn discord_stop(state: tauri::State<'_, Discord>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some((_, mut c)) = guard.take() {
        let _ = c.clear_activity();
        let _ = c.close();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Discord(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![fetch_bytes, discord_set, discord_stop])
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "windows")]
            window_vibrancy::apply_acrylic(&win, Some((18, 18, 30, 120)))
                .expect("acrylic unsupported");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}