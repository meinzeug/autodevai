// AutoDev-AI Neural Bridge Platform - API Layer
//! API integration layer for external services

pub mod claude_flow;
pub mod docker;

use crate::errors::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// API client configuration
#[derive(Debug, Clone)]
pub struct ApiConfig {
    pub base_url: String,
    pub timeout: Duration,
    pub auth_token: Option<String>,
    pub user_agent: String,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            base_url: "http://localhost:3000".to_string(),
            timeout: Duration::from_secs(30),
            auth_token: None,
            user_agent: format!("neural-bridge-platform/{}", env!("CARGO_PKG_VERSION")),
        }
    }
}

/// Generic API client
pub struct ApiClient {
    client: Client,
    config: ApiConfig,
}

impl ApiClient {
    /// Create a new API client with configuration
    pub fn new(config: ApiConfig) -> Result<Self> {
        let client = Client::builder()
            .timeout(config.timeout)
            .user_agent(&config.user_agent)
            .build()
            .map_err(|e| crate::errors::NeuralBridgeError::network(e.to_string()))?;

        Ok(Self { client, config })
    }

    /// Make a GET request
    pub async fn get<T>(&self, endpoint: &str) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!(
            "{}/{}",
            self.config.base_url.trim_end_matches('/'),
            endpoint.trim_start_matches('/')
        );

        let mut request = self.client.get(&url);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::network(e.to_string()))?;

        if !response.status().is_success() {
            return Err(crate::errors::NeuralBridgeError::api(
                format!("API request failed with status: {}", response.status()),
                Some(response.status().as_u16()),
            ));
        }

        response
            .json::<T>()
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::api(e.to_string(), None))
    }

    /// Make a POST request
    pub async fn post<T, R>(&self, endpoint: &str, data: &T) -> Result<R>
    where
        T: Serialize,
        R: for<'de> Deserialize<'de>,
    {
        let url = format!(
            "{}/{}",
            self.config.base_url.trim_end_matches('/'),
            endpoint.trim_start_matches('/')
        );

        let mut request = self.client.post(&url).json(data);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::network(e.to_string()))?;

        if !response.status().is_success() {
            return Err(crate::errors::NeuralBridgeError::api(
                format!("API request failed with status: {}", response.status()),
                Some(response.status().as_u16()),
            ));
        }

        response
            .json::<R>()
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::api(e.to_string(), None))
    }

    /// Make a PUT request
    pub async fn put<T, R>(&self, endpoint: &str, data: &T) -> Result<R>
    where
        T: Serialize,
        R: for<'de> Deserialize<'de>,
    {
        let url = format!(
            "{}/{}",
            self.config.base_url.trim_end_matches('/'),
            endpoint.trim_start_matches('/')
        );

        let mut request = self.client.put(&url).json(data);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::network(e.to_string()))?;

        if !response.status().is_success() {
            return Err(crate::errors::NeuralBridgeError::api(
                format!("API request failed with status: {}", response.status()),
                Some(response.status().as_u16()),
            ));
        }

        response
            .json::<R>()
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::api(e.to_string(), None))
    }

    /// Make a DELETE request
    pub async fn delete(&self, endpoint: &str) -> Result<()> {
        let url = format!(
            "{}/{}",
            self.config.base_url.trim_end_matches('/'),
            endpoint.trim_start_matches('/')
        );

        let mut request = self.client.delete(&url);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::network(e.to_string()))?;

        if !response.status().is_success() {
            return Err(crate::errors::NeuralBridgeError::api(
                format!("API request failed with status: {}", response.status()),
                Some(response.status().as_u16()),
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_config_default() {
        let config = ApiConfig::default();
        assert_eq!(config.base_url, "http://localhost:3000");
        assert_eq!(config.timeout, Duration::from_secs(30));
        assert!(config.auth_token.is_none());
    }

    #[test]
    fn test_api_client_creation() {
        let config = ApiConfig::default();
        let client = ApiClient::new(config);
        assert!(client.is_ok());
    }
}
