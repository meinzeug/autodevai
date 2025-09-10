#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_id_generation() {
        use crate::utils::generate_id;
        let id = generate_id();
        assert!(!id.is_empty());
        assert!(id.len() > 20);
    }
    #[test]
    fn test_timestamp() {
        use crate::utils::get_timestamp;
        let ts = get_timestamp();
        assert!(ts > 0);
    }
}
