// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use tauri::{Manager, State};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Default)]
struct AppState {
    flask_process: Arc<Mutex<Option<std::process::Child>>>,
    ollama_process: Arc<Mutex<Option<std::process::Child>>>,
}

#[derive(Serialize, Deserialize)]
struct ServiceStatus {
    flask_running: bool,
    ollama_running: bool,
    message: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to StudyCompanion!", name)
}

#[tauri::command]
async fn start_backend_services(state: State<'_, AppState>) -> Result<ServiceStatus, String> {
    println!("Starting backend services...");
    
    // Start Ollama if not running
    match check_ollama_running().await {
        Ok(true) => println!("Ollama is already running"),
        Ok(false) => {
            println!("Starting Ollama...");
            start_ollama(&state).await?;
        }
        Err(e) => return Err(format!("Failed to check Ollama status: {}", e)),
    }
    
    // Start Flask backend
    start_flask_backend(&state).await?;
    
    // Wait a moment for services to start
    tokio::time::sleep(Duration::from_secs(3)).await;
    
    // Verify services are running
    let flask_running = check_flask_running().await.unwrap_or(false);
    let ollama_running = check_ollama_running().await.unwrap_or(false);
    
    Ok(ServiceStatus {
        flask_running,
        ollama_running,
        message: if flask_running && ollama_running {
            "All services started successfully".to_string()
        } else {
            "Some services failed to start".to_string()
        },
    })
}

#[tauri::command]
async fn check_service_status() -> Result<ServiceStatus, String> {
    let flask_running = check_flask_running().await.unwrap_or(false);
    let ollama_running = check_ollama_running().await.unwrap_or(false);
    
    Ok(ServiceStatus {
        flask_running,
        ollama_running,
        message: format!("Flask: {}, Ollama: {}", 
                        if flask_running { "Running" } else { "Stopped" },
                        if ollama_running { "Running" } else { "Stopped" }),
    })
}

#[tauri::command]
async fn install_ollama_and_model() -> Result<String, String> {
    println!("Installing Ollama and phi model...");
    
    // Check if Ollama is already installed
    if check_ollama_installed() {
        println!("Ollama is already installed");
        
        // Check if phi model is available
        if check_phi_model_available().await {
            return Ok("Ollama and phi model are already installed".to_string());
        } else {
            // Pull phi model
            println!("Pulling phi model...");
            pull_phi_model().await?;
            return Ok("Phi model installed successfully".to_string());
        }
    }
    
    // Install Ollama based on platform
    install_ollama().await?;
    
    // Wait for installation to complete
    tokio::time::sleep(Duration::from_secs(5)).await;
    
    // Pull phi model
    println!("Pulling phi model...");
    pull_phi_model().await?;
    
    Ok("Ollama and phi model installed successfully".to_string())
}

async fn start_ollama(state: &State<'_, AppState>) -> Result<(), String> {
    let mut process = Command::new("ollama")
        .arg("serve")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start Ollama: {}", e))?;
    
    // Store the process handle
    let mut ollama_process = state.ollama_process.lock().unwrap();
    *ollama_process = Some(process);
    
    Ok(())
}

async fn start_flask_backend(state: &State<'_, AppState>) -> Result<(), String> {
    // Get the resource directory
    let resource_dir = std::env::current_exe()
        .map_err(|e| format!("Failed to get current exe path: {}", e))?
        .parent()
        .ok_or("Failed to get parent directory")?
        .join("backend");
    
    let flask_script = resource_dir.join("app.py");
    
    if !flask_script.exists() {
        return Err("Backend script not found. Make sure app.py is bundled with the application.".to_string());
    }
    
    // Start Flask backend
    let process = Command::new("python")
        .arg(flask_script)
        .env("PORT", "8000")
        .env("FLASK_ENV", "production")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start Flask backend: {}", e))?;
    
    // Store the process handle
    let mut flask_process = state.flask_process.lock().unwrap();
    *flask_process = Some(process);
    
    Ok(())
}

async fn check_flask_running() -> Result<bool, reqwest::Error> {
    let client = reqwest::Client::new();
    match client
        .get("http://localhost:8000/api/health")
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

async fn check_ollama_running() -> Result<bool, reqwest::Error> {
    let client = reqwest::Client::new();
    match client
        .get("http://localhost:11434/api/tags")
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

fn check_ollama_installed() -> bool {
    Command::new("ollama")
        .arg("--version")
        .output()
        .is_ok()
}

async fn check_phi_model_available() -> bool {
    let client = reqwest::Client::new();
    match client
        .get("http://localhost:11434/api/tags")
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => {
            if let Ok(text) = response.text().await {
                text.contains("phi")
            } else {
                false
            }
        }
        Err(_) => false,
    }
}

async fn install_ollama() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Download and install Ollama for Windows
        let output = Command::new("powershell")
            .arg("-Command")
            .arg("Invoke-WebRequest -Uri https://ollama.ai/download/windows -OutFile ollama-installer.exe; Start-Process -FilePath .\\ollama-installer.exe -ArgumentList '/S' -Wait")
            .output()
            .map_err(|e| format!("Failed to install Ollama on Windows: {}", e))?;
        
        if !output.status.success() {
            return Err("Ollama installation failed".to_string());
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // Install Ollama for macOS
        let output = Command::new("curl")
            .arg("-fsSL")
            .arg("https://ollama.ai/install.sh")
            .arg("|")
            .arg("sh")
            .output()
            .map_err(|e| format!("Failed to install Ollama on macOS: {}", e))?;
        
        if !output.status.success() {
            return Err("Ollama installation failed".to_string());
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Install Ollama for Linux
        let output = Command::new("curl")
            .arg("-fsSL")
            .arg("https://ollama.ai/install.sh")
            .arg("|")
            .arg("sh")
            .output()
            .map_err(|e| format!("Failed to install Ollama on Linux: {}", e))?;
        
        if !output.status.success() {
            return Err("Ollama installation failed".to_string());
        }
    }
    
    Ok(())
}

async fn pull_phi_model() -> Result<(), String> {
    let output = Command::new("ollama")
        .arg("pull")
        .arg("phi")
        .output()
        .map_err(|e| format!("Failed to pull phi model: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to pull phi model: {}", error));
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            start_backend_services,
            check_service_status,
            install_ollama_and_model
        ])
        .setup(|app| {
            let app_handle = app.handle();
            
            // Start backend services on app startup
            tauri::async_runtime::spawn(async move {
                println!("Starting StudyCompanion...");
                
                // Wait a moment for the app to fully initialize
                tokio::time::sleep(Duration::from_secs(2)).await;
                
                // Get the app state
                if let Some(state) = app_handle.try_state::<AppState>() {
                    match start_backend_services(state).await {
                        Ok(status) => println!("Backend services status: {}", status.message),
                        Err(e) => eprintln!("Failed to start backend services: {}", e),
                    }
                }
            });
            
            Ok(())
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { .. } => {
                // Clean up processes when window is closed
                if let Some(state) = event.window().state::<AppState>() {
                    // Stop Flask process
                    if let Ok(mut flask_process) = state.flask_process.lock() {
                        if let Some(mut process) = flask_process.take() {
                            let _ = process.kill();
                        }
                    }
                    
                    // Stop Ollama process
                    if let Ok(mut ollama_process) = state.ollama_process.lock() {
                        if let Some(mut process) = ollama_process.take() {
                            let _ = process.kill();
                        }
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
