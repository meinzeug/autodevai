// Security Manager Module
// Handles API key validation, encryption, and security features

use serde::{Deserialize, Serialize};
use anyhow::{Result, anyhow};
use std::collections::HashMap;

#[derive(Debug)]
pub struct SecurityManager {
    initialized: bool,
    validators: HashMap<String, Box<dyn ApiKeyValidator + Send + Sync>>,
}

pub trait ApiKeyValidator {
    fn validate(&self, key: &str) -> bool;
    fn provider_name(&self) -> &str;
}

struct AnthropicValidator;
impl ApiKeyValidator for AnthropicValidator {
    fn validate(&self, key: &str) -> bool {
        key.starts_with("sk-ant-") && key.len() > 20
    }
    
    fn provider_name(&self) -> &str {
        "anthropic"
    }
}

struct OpenAIValidator;
impl ApiKeyValidator for OpenAIValidator {
    fn validate(&self, key: &str) -> bool {
        key.starts_with("sk-") && key.len() > 20 && !key.starts_with("sk-ant-")
    }
    
    fn provider_name(&self) -> &str {
        "openai"
    }
}

struct OpenRouterValidator;
impl ApiKeyValidator for OpenRouterValidator {
    fn validate(&self, key: &str) -> bool {
        key.starts_with("sk-or-") && key.len() > 20
    }
    
    fn provider_name(&self) -> &str {
        "openrouter"
    }
}

impl SecurityManager {
    pub fn new() -> Self {
        Self {
            initialized: false,
            validators: HashMap::new(),
        }
    }

    pub async fn initialize(&mut self) -> Result<()> {
        // Initialize API key validators
        self.validators.insert(
            "anthropic".to_string(),
            Box::new(AnthropicValidator),
        );
        
        self.validators.insert(
            "openai".to_string(),
            Box::new(OpenAIValidator),
        );
        
        self.validators.insert(
            "openrouter".to_string(),
            Box::new(OpenRouterValidator),
        );

        self.initialized = true;
        tracing::info!("Security Manager initialized with {} validators", self.validators.len());
        Ok(())
    }

    pub async fn validate_api_key(&self, provider: &str, key: &str) -> Result<bool> {
        if !self.initialized {
            return Err(anyhow!("Security Manager not initialized"));
        }

        if key.is_empty() {
            return Ok(false);
        }

        match self.validators.get(provider) {
            Some(validator) => {
                let is_valid = validator.validate(key);
                tracing::debug!("API key validation for {}: {}", provider, is_valid);
                Ok(is_valid)
            }
            None => Err(anyhow!("Unknown provider: {}", provider)),
        }
    }

    pub fn encrypt_key(&self, key: &str) -> Result<String> {
        // Simple encryption simulation (in production, use proper encryption)
        let encrypted = base64::encode(key.as_bytes());
        Ok(encrypted)
    }

    pub fn decrypt_key(&self, encrypted_key: &str) -> Result<String> {
        // Simple decryption simulation
        let decrypted = String::from_utf8(base64::decode(encrypted_key)?)?;
        Ok(decrypted)
    }

    pub fn hash_key(&self, key: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        hex::encode(hasher.finalize())
    }
}

// Add base64 module since we use it
mod base64 {
    pub fn encode(input: &[u8]) -> String {
        // Simple base64 encoding simulation
        format!("b64_{}", hex::encode(input))
    }

    pub fn decode(input: &str) -> Result<Vec<u8>, anyhow::Error> {
        if let Some(hex_part) = input.strip_prefix("b64_") {
            hex::decode(hex_part).map_err(|e| anyhow::anyhow!("Decode error: {}", e))
        } else {
            Err(anyhow::anyhow!("Invalid base64 format"))
        }
    }
}