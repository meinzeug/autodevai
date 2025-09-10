# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "autodevai_cache_subnet_group" {
  name       = "autodevai-cache-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_subnets[*].id
  
  tags = {
    Name = "autodevai-cache-subnet-group-${var.environment}"
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "autodevai_redis_pg" {
  name   = "autodevai-redis-pg-${var.environment}"
  family = "redis7.x"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  tags = {
    Name = "autodevai-redis-pg-${var.environment}"
  }
}

# Generate random auth token for Redis
resource "random_password" "redis_auth_token" {
  length  = 64
  special = false # Redis auth token cannot contain special characters
}

# Store Redis auth token in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name        = "autodevai-redis-auth-token-${var.environment}"
  description = "Redis authentication token for AutoDev-AI"
  
  tags = {
    Name = "autodevai-redis-auth-token-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
  })
}

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "autodevai_redis" {
  replication_group_id         = "autodevai-redis-${var.environment}"
  description                  = "Redis cluster for AutoDev-AI ${var.environment}"
  
  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  port                = 6379
  parameter_group_name = aws_elasticache_parameter_group.autodevai_redis_pg.name
  node_type           = var.redis_node_type
  
  # Cluster configuration
  num_cache_clusters = var.redis_num_cache_nodes
  
  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.autodevai_cache_subnet_group.name
  security_group_ids = [aws_security_group.elasticache_sg.id]
  
  # Security configuration
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  
  # Backup configuration
  snapshot_retention_limit = 3
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "sun:05:00-sun:07:00"
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }
  
  # Automatic failover for multi-AZ
  automatic_failover_enabled = var.redis_num_cache_nodes > 1
  multi_az_enabled          = var.redis_num_cache_nodes > 1
  
  # Notifications
  notification_topic_arn = aws_sns_topic.cache_alerts.arn
  
  tags = {
    Name = "autodevai-redis-${var.environment}"
  }
  
  depends_on = [aws_cloudwatch_log_group.redis_slow_log]
}

# CloudWatch Log Groups for Redis
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/autodevai-redis-${var.environment}/slow-log"
  retention_in_days = 7
  
  tags = {
    Name = "autodevai-redis-slow-log-${var.environment}"
  }
}

# SNS Topic for cache alerts
resource "aws_sns_topic" "cache_alerts" {
  name = "autodevai-cache-alerts-${var.environment}"
  
  tags = {
    Name = "autodevai-cache-alerts-${var.environment}"
  }
}

# ElastiCache Event Subscription
resource "aws_elasticache_event_subscription" "autodevai_cache_events" {
  name      = "autodevai-cache-events-${var.environment}"
  sns_topic = aws_sns_topic.cache_alerts.arn
  
  source_type = "replication-group"
  source_ids  = [aws_elasticache_replication_group.autodevai_redis.id]
  
  tags = {
    Name = "autodevai-cache-events-${var.environment}"
  }
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu_utilization" {
  alarm_name          = "autodevai-redis-cpu-utilization-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors redis cpu utilization"
  alarm_actions       = [aws_sns_topic.cache_alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.autodevai_redis.id
  }
  
  tags = {
    Name = "autodevai-redis-cpu-alarm-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory_utilization" {
  alarm_name          = "autodevai-redis-memory-utilization-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors redis memory utilization"
  alarm_actions       = [aws_sns_topic.cache_alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.autodevai_redis.id
  }
  
  tags = {
    Name = "autodevai-redis-memory-alarm-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  alarm_name          = "autodevai-redis-connections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors redis current connections"
  alarm_actions       = [aws_sns_topic.cache_alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.autodevai_redis.id
  }
  
  tags = {
    Name = "autodevai-redis-connections-alarm-${var.environment}"
  }
}