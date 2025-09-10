# RDS Subnet Group
resource "aws_db_subnet_group" "autodevai_db_subnet_group" {
  name       = "autodevai-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_subnets[*].id
  
  tags = {
    Name = "autodevai-db-subnet-group-${var.environment}"
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "autodevai_pg" {
  name   = "autodevai-pg-${var.environment}"
  family = "postgres15"
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
  
  parameter {
    name  = "log_statement"
    value = "all"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  
  parameter {
    name  = "max_connections"
    value = "200"
  }
  
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }
  
  tags = {
    Name = "autodevai-pg-${var.environment}"
  }
}

# RDS Option Group
resource "aws_db_option_group" "autodevai_og" {
  name                     = "autodevai-og-${var.environment}"
  option_group_description = "Option group for AutoDev-AI PostgreSQL"
  engine_name              = "postgres"
  major_engine_version     = "15"
  
  tags = {
    Name = "autodevai-og-${var.environment}"
  }
}

# Generate random password for RDS
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name        = "autodevai-db-password-${var.environment}"
  description = "Database password for AutoDev-AI"
  
  tags = {
    Name = "autodevai-db-password-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = "autodevai"
    password = random_password.db_password.result
  })
}

# RDS Instance
resource "aws_db_instance" "autodevai_db" {
  identifier = "autodevai-db-${var.environment}"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = var.rds_instance_class
  
  # Storage configuration
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.rds_encryption_key.arn
  
  # Database configuration
  db_name  = "autodevai"
  username = "autodevai"
  password = random_password.db_password.result
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.autodevai_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false
  
  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.autodevai_pg.name
  option_group_name    = aws_db_option_group.autodevai_og.name
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  delete_automated_backups = false
  
  # Monitoring
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_enhanced_monitoring.arn
  
  # Security
  deletion_protection = var.environment == "prod" ? true : false
  skip_final_snapshot = var.environment == "prod" ? false : true
  final_snapshot_identifier = var.environment == "prod" ? "autodevai-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  
  # Enable automatic minor version upgrades
  auto_minor_version_upgrade = true
  
  # Enable backup
  backup_retention_period = 7
  
  tags = {
    Name = "autodevai-db-${var.environment}"
  }
  
  depends_on = [aws_kms_key.rds_encryption_key]
}

# Read Replica for production
resource "aws_db_instance" "autodevai_db_replica" {
  count = var.environment == "prod" ? 1 : 0
  
  identifier = "autodevai-db-replica-${var.environment}"
  
  # Replica configuration
  replicate_source_db = aws_db_instance.autodevai_db.id
  instance_class     = var.rds_instance_class
  
  # Network configuration
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false
  
  # Monitoring
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_enhanced_monitoring.arn
  
  tags = {
    Name = "autodevai-db-replica-${var.environment}"
  }
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds_encryption_key" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 7
  
  tags = {
    Name = "autodevai-rds-encryption-key-${var.environment}"
  }
}

resource "aws_kms_alias" "rds_encryption_key_alias" {
  name          = "alias/autodevai-rds-${var.environment}"
  target_key_id = aws_kms_key.rds_encryption_key.key_id
}

# IAM role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "rds-monitoring-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = ""
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Log Group for RDS
resource "aws_cloudwatch_log_group" "rds_log_group" {
  name              = "/aws/rds/instance/autodevai-db-${var.environment}/postgresql"
  retention_in_days = 7
}

# RDS Database Event Subscription
resource "aws_db_event_subscription" "autodevai_db_events" {
  name      = "autodevai-db-events-${var.environment}"
  sns_topic = aws_sns_topic.db_alerts.arn
  
  source_type = "db-instance"
  source_ids  = [aws_db_instance.autodevai_db.id]
  
  event_categories = [
    "availability",
    "deletion",
    "failover",
    "failure",
    "low storage",
    "maintenance",
    "notification",
    "read replica",
    "recovery",
    "restoration"
  ]
  
  tags = {
    Name = "autodevai-db-events-${var.environment}"
  }
}

# SNS Topic for database alerts
resource "aws_sns_topic" "db_alerts" {
  name = "autodevai-db-alerts-${var.environment}"
  
  tags = {
    Name = "autodevai-db-alerts-${var.environment}"
  }
}