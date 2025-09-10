// use crate::{DualModeRequest, DualModeResponse, ExecutionRequest, ExecutionResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DualModeRequest {
    pub id: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DualModeResponse {
    pub id: String,
    pub result: String,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRequest {
    pub id: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResponse {
    pub id: String,
    pub result: Option<String>,
    pub success: bool,
    pub execution_time: f64,
}
use anyhow::{anyhow, Result};
use chrono::Utc;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::Instant;
use tokio::process::Command;
use tracing::{debug, error, info};

#[derive(Debug, Clone)]
pub struct ClaudeFlowService {
    pub base_path: String,
}

impl ClaudeFlowService {
    pub fn new() -> Self {
        Self {
            base_path: ".".to_string(),
        }
    }

    pub async fn execute(&self, request: ExecutionRequest) -> Result<ExecutionResponse> {
        let start_time = Instant::now();

        info!(
            "Executing Claude Flow with prompt length: {}",
            request.prompt.len()
        );

        // Create a temporary file for the prompt if it's complex
        let temp_file = if request.prompt.len() > 1000 {
            let temp_path = format!("/tmp/claude_prompt_{}.txt", uuid::Uuid::new_v4());
            tokio::fs::write(&temp_path, &request.prompt).await?;
            Some(temp_path)
        } else {
            None
        };

        // Build Claude Flow command
        let mut cmd = Command::new("npx");
        cmd.args(["claude-flow@alpha", "sparc", "run", "coder"]);

        if let Some(temp_path) = &temp_file {
            cmd.arg(format!("@{}", temp_path));
        } else {
            cmd.arg(&request.prompt);
        }

        // Add language context if provided
        if let Some(ref language) = request.language {
            cmd.env("CLAUDE_FLOW_LANGUAGE", language);
        }

        // Add context if provided
        if let Some(ref context) = request.context {
            cmd.env("CLAUDE_FLOW_CONTEXT", context);
        }

        // Set working directory
        cmd.current_dir(&self.base_path);

        debug!("Executing command: {:?}", cmd);

        // Execute the command
        let output = match cmd.output().await {
            Ok(output) => output,
            Err(e) => {
                error!("Failed to execute Claude Flow command: {}", e);
                return Ok(ExecutionResponse {
                    success: false,
                    result: None,
                    error: Some(format!("Command execution failed: {}", e)),
                    execution_time: start_time.elapsed().as_millis() as u64,
                    metadata: None,
                });
            }
        };

        // Clean up temp file
        if let Some(temp_path) = temp_file {
            let _ = tokio::fs::remove_file(temp_path).await;
        }

        let execution_time = start_time.elapsed().as_millis() as u64;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            info!("Claude Flow execution completed in {}ms", execution_time);

            let metadata = json!({
                "stdout_length": stdout.len(),
                "stderr_length": stderr.len(),
                "exit_code": output.status.code(),
                "timestamp": Utc::now().to_rfc3339(),
                "service": "claude-flow"
            });

            Ok(ExecutionResponse {
                success: true,
                result: Some(stdout.to_string()),
                error: if stderr.is_empty() {
                    None
                } else {
                    Some(stderr.to_string())
                },
                execution_time,
                metadata: Some(metadata),
            })
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Claude Flow execution failed: {}", stderr);

            Ok(ExecutionResponse {
                success: false,
                result: None,
                error: Some(stderr.to_string()),
                execution_time,
                metadata: Some(json!({
                    "exit_code": output.status.code(),
                    "timestamp": Utc::now().to_rfc3339(),
                    "service": "claude-flow"
                })),
            })
        }
    }

    pub async fn execute_with_mode(&self, prompt: &str, mode: &str) -> Result<ExecutionResponse> {
        let request = ExecutionRequest {
            prompt: prompt.to_string(),
            language: None,
            context: Some(format!("mode:{}", mode)),
            temperature: None,
        };

        self.execute(request).await
    }

    pub async fn health_check(&self) -> Result<bool> {
        let output = Command::new("npx")
            .args(["claude-flow@alpha", "--version"])
            .output()
            .await?;

        Ok(output.status.success())
    }
}

#[derive(Debug, Clone)]
pub struct CodexService {
    pub api_key: Option<String>,
}

impl CodexService {
    pub fn new() -> Self {
        Self {
            api_key: std::env::var("OPENAI_API_KEY").ok(),
        }
    }

    pub async fn execute(&self, request: ExecutionRequest) -> Result<ExecutionResponse> {
        let start_time = Instant::now();

        info!(
            "Executing OpenAI Codex with prompt length: {}",
            request.prompt.len()
        );

        // For now, we'll simulate Codex with a Python script that calls OpenAI API
        let python_script = self.generate_codex_script(&request)?;

        // Write Python script to temp file
        let script_path = format!("/tmp/codex_script_{}.py", uuid::Uuid::new_v4());
        tokio::fs::write(&script_path, python_script).await?;

        // Execute Python script
        let mut cmd = Command::new("python3");
        cmd.arg(&script_path);

        if let Some(ref api_key) = self.api_key {
            cmd.env("OPENAI_API_KEY", api_key);
        }

        debug!("Executing Codex Python script: {}", script_path);

        let output = match cmd.output().await {
            Ok(output) => output,
            Err(e) => {
                error!("Failed to execute Codex script: {}", e);
                let _ = tokio::fs::remove_file(&script_path).await;
                return Ok(ExecutionResponse {
                    success: false,
                    result: None,
                    error: Some(format!("Script execution failed: {}", e)),
                    execution_time: start_time.elapsed().as_millis() as u64,
                    metadata: None,
                });
            }
        };

        // Clean up script file
        let _ = tokio::fs::remove_file(&script_path).await;

        let execution_time = start_time.elapsed().as_millis() as u64;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            info!("Codex execution completed in {}ms", execution_time);

            // Try to parse JSON response from Python script
            let result = if let Ok(json_result) = serde_json::from_str::<Value>(&stdout) {
                json_result
                    .get("result")
                    .and_then(|r| r.as_str())
                    .unwrap_or(&stdout)
                    .to_string()
            } else {
                stdout.to_string()
            };

            let metadata = json!({
                "stdout_length": stdout.len(),
                "stderr_length": stderr.len(),
                "exit_code": output.status.code(),
                "timestamp": Utc::now().to_rfc3339(),
                "service": "openai-codex",
                "api_key_present": self.api_key.is_some()
            });

            Ok(ExecutionResponse {
                success: true,
                result: Some(result),
                error: if stderr.is_empty() {
                    None
                } else {
                    Some(stderr.to_string())
                },
                execution_time,
                metadata: Some(metadata),
            })
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Codex execution failed: {}", stderr);

            Ok(ExecutionResponse {
                success: false,
                result: None,
                error: Some(stderr.to_string()),
                execution_time,
                metadata: Some(json!({
                    "exit_code": output.status.code(),
                    "timestamp": Utc::now().to_rfc3339(),
                    "service": "openai-codex"
                })),
            })
        }
    }

    fn generate_codex_script(&self, request: &ExecutionRequest) -> Result<String> {
        let temperature = request.temperature.unwrap_or(0.7);
        let language = request.language.as_deref().unwrap_or("python");

        let script = format!(
            r#"
import os
import json
import sys

try:
    import openai
except ImportError:
    print(json.dumps({{"error": "OpenAI library not installed. Run: pip install openai"}}))
    sys.exit(1)

def main():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print(json.dumps({{"error": "OPENAI_API_KEY environment variable not set"}}))
        sys.exit(1)
    
    try:
        # Set up OpenAI client
        openai.api_key = api_key
        
        # Prepare the prompt
        prompt = """{}"""
        
        # Add language context if specified
        if "{}" != "python":
            prompt = f"Language: {}\n\n" + prompt
        
        # Add context if provided
        context = """{}"""
        if context and context != "None":
            prompt = f"Context: {{context}}\n\n" + prompt
        
        # Make API call to OpenAI
        response = openai.Completion.create(
            engine="code-davinci-002",  # Codex model
            prompt=prompt,
            max_tokens=2048,
            temperature={},
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        
        result = response.choices[0].text.strip()
        
        output = {{
            "success": True,
            "result": result,
            "usage": response.usage._asdict() if hasattr(response, 'usage') else None,
            "model": response.model if hasattr(response, 'model') else "code-davinci-002"
        }}
        
        print(json.dumps(output))
        
    except Exception as e:
        error_output = {{
            "success": False,
            "error": str(e),
            "type": type(e).__name__
        }}
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    main()
"#,
            request.prompt.replace("\"", "\\\"").replace("\n", "\\n"),
            language,
            language,
            request
                .context
                .as_deref()
                .unwrap_or("None")
                .replace("\"", "\\\""),
            temperature
        );

        Ok(script)
    }

    pub async fn health_check(&self) -> Result<bool> {
        if self.api_key.is_none() {
            return Ok(false);
        }

        let output = Command::new("python3")
            .args(["-c", "import openai; print('OK')"])
            .output()
            .await?;

        Ok(output.status.success())
    }
}

#[derive(Debug, Clone)]
pub struct OrchestrationService {
    pub claude_flow: ClaudeFlowService,
    pub codex: CodexService,
}

impl OrchestrationService {
    pub fn new(claude_flow: ClaudeFlowService, codex: CodexService) -> Self {
        Self { claude_flow, codex }
    }

    pub async fn execute_dual_mode(&self, request: DualModeRequest) -> Result<DualModeResponse> {
        info!("Starting dual mode execution: {}", request.comparison_mode);

        let claude_request = ExecutionRequest {
            prompt: request.prompt.clone(),
            language: request
                .claude_config
                .as_ref()
                .and_then(|c| c.get("language"))
                .and_then(|l| l.as_str())
                .map(|s| s.to_string()),
            context: request
                .claude_config
                .as_ref()
                .and_then(|c| c.get("context"))
                .and_then(|c| c.as_str())
                .map(|s| s.to_string()),
            temperature: request
                .claude_config
                .as_ref()
                .and_then(|c| c.get("temperature"))
                .and_then(|t| t.as_f64())
                .map(|t| t as f32),
        };

        let codex_request = ExecutionRequest {
            prompt: request.prompt.clone(),
            language: request
                .codex_config
                .as_ref()
                .and_then(|c| c.get("language"))
                .and_then(|l| l.as_str())
                .map(|s| s.to_string()),
            context: request
                .codex_config
                .as_ref()
                .and_then(|c| c.get("context"))
                .and_then(|c| c.as_str())
                .map(|s| s.to_string()),
            temperature: request
                .codex_config
                .as_ref()
                .and_then(|c| c.get("temperature"))
                .and_then(|t| t.as_f64())
                .map(|t| t as f32),
        };

        let (claude_result, codex_result) = match request.comparison_mode.as_str() {
            "parallel" => {
                info!("Executing parallel mode");
                let (claude_future, codex_future) = tokio::join!(
                    self.claude_flow.execute(claude_request),
                    self.codex.execute(codex_request)
                );
                (claude_future, codex_future)
            }
            "sequential" => {
                info!("Executing sequential mode (Claude first)");
                let claude_result = self.claude_flow.execute(claude_request).await;
                let codex_result = self.codex.execute(codex_request).await;
                (claude_result, codex_result)
            }
            "best_of" => {
                info!("Executing best_of mode");
                // Execute both and choose the best result based on criteria
                let (claude_future, codex_future) = tokio::join!(
                    self.claude_flow.execute(claude_request),
                    self.codex.execute(codex_request)
                );
                (claude_future, codex_future)
            }
            _ => {
                return Err(anyhow!(
                    "Unknown comparison mode: {}",
                    request.comparison_mode
                ));
            }
        };

        let claude_response = claude_result.ok();
        let codex_response = codex_result.ok();

        // Generate comparison and recommendation
        let (comparison, recommendation) =
            self.analyze_results(&claude_response, &codex_response, &request.comparison_mode);

        Ok(DualModeResponse {
            success: claude_response.is_some() || codex_response.is_some(),
            claude_result: claude_response,
            codex_result: codex_response,
            comparison: Some(comparison),
            recommendation,
        })
    }

    fn analyze_results(
        &self,
        claude_result: &Option<ExecutionResponse>,
        codex_result: &Option<ExecutionResponse>,
        mode: &str,
    ) -> (Value, Option<String>) {
        let mut comparison = json!({
            "mode": mode,
            "timestamp": Utc::now().to_rfc3339(),
        });

        let mut scores = HashMap::new();

        // Analyze Claude result
        if let Some(claude) = claude_result {
            let claude_score = self.calculate_score(claude);
            scores.insert("claude", claude_score);
            comparison["claude"] = json!({
                "success": claude.success,
                "execution_time": claude.execution_time,
                "result_length": claude.result.as_ref().map(|r| r.len()).unwrap_or(0),
                "has_error": claude.error.is_some(),
                "score": claude_score
            });
        } else {
            comparison["claude"] = json!({
                "success": false,
                "error": "Execution failed or not attempted"
            });
        }

        // Analyze Codex result
        if let Some(codex) = codex_result {
            let codex_score = self.calculate_score(codex);
            scores.insert("codex", codex_score);
            comparison["codex"] = json!({
                "success": codex.success,
                "execution_time": codex.execution_time,
                "result_length": codex.result.as_ref().map(|r| r.len()).unwrap_or(0),
                "has_error": codex.error.is_some(),
                "score": codex_score
            });
        } else {
            comparison["codex"] = json!({
                "success": false,
                "error": "Execution failed or not attempted"
            });
        }

        // Generate recommendation
        let recommendation = if mode == "best_of" {
            if let (Some(claude_score), Some(codex_score)) =
                (scores.get("claude"), scores.get("codex"))
            {
                if claude_score > codex_score {
                    Some(format!(
                        "Claude Flow performed better (score: {:.2} vs {:.2})",
                        claude_score, codex_score
                    ))
                } else if codex_score > claude_score {
                    Some(format!(
                        "OpenAI Codex performed better (score: {:.2} vs {:.2})",
                        codex_score, claude_score
                    ))
                } else {
                    Some("Both models performed equally well".to_string())
                }
            } else if scores.contains_key("claude") {
                Some("Only Claude Flow completed successfully".to_string())
            } else if scores.contains_key("codex") {
                Some("Only OpenAI Codex completed successfully".to_string())
            } else {
                Some("Both executions failed".to_string())
            }
        } else {
            Some(format!("Executed in {} mode", mode))
        };

        comparison["scores"] = json!(scores);

        (comparison, recommendation)
    }

    fn calculate_score(&self, response: &ExecutionResponse) -> f64 {
        let mut score = 0.0;

        // Success bonus
        if response.success {
            score += 50.0;
        }

        // Result quality (length as a rough proxy)
        if let Some(ref result) = response.result {
            let length_score = (result.len() as f64 / 100.0).min(25.0);
            score += length_score;
        }

        // Speed bonus (faster is better)
        let speed_score = if response.execution_time > 0 {
            (10000.0 / response.execution_time as f64).min(15.0)
        } else {
            15.0
        };
        score += speed_score;

        // Error penalty
        if response.error.is_some() {
            score -= 10.0;
        }

        score.max(0.0)
    }

    pub async fn health_check(&self) -> Result<HashMap<String, bool>> {
        let mut status = HashMap::new();

        let claude_health = self.claude_flow.health_check().await.unwrap_or(false);
        let codex_health = self.codex.health_check().await.unwrap_or(false);

        status.insert("claude_flow".to_string(), claude_health);
        status.insert("codex".to_string(), codex_health);

        Ok(status)
    }
}
