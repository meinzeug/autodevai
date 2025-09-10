# AWS Config for compliance monitoring
resource "aws_config_configuration_recorder" "autodevai_config_recorder" {
  name     = "autodevai-config-recorder-${var.environment}"
  role_arn = aws_iam_role.config_role.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }

  depends_on = [aws_config_delivery_channel.autodevai_config_delivery_channel]
}

# Config delivery channel
resource "aws_config_delivery_channel" "autodevai_config_delivery_channel" {
  name           = "autodevai-config-delivery-channel-${var.environment}"
  s3_bucket_name = aws_s3_bucket.config_logs.bucket
}

# S3 bucket for Config logs
resource "aws_s3_bucket" "config_logs" {
  bucket = "autodevai-config-logs-${var.environment}-${random_string.bucket_suffix.result}"
  
  tags = {
    Name = "autodevai-config-logs-${var.environment}"
  }
}

# Block public access to Config logs bucket
resource "aws_s3_bucket_public_access_block" "config_logs_pab" {
  bucket = aws_s3_bucket.config_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Config S3 bucket policy
resource "aws_s3_bucket_policy" "config_logs_policy" {
  bucket = aws_s3_bucket.config_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSConfigBucketPermissionsCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.config_logs.arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketExistenceCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.config_logs.arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketDelivery"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.config_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# IAM role for AWS Config
resource "aws_iam_role" "config_role" {
  name = "autodevai-config-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "autodevai-config-role-${var.environment}"
  }
}

# Attach AWS Config service policy
resource "aws_iam_role_policy_attachment" "config_role_policy" {
  role       = aws_iam_role.config_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigServiceRole"
}

# Security Hub for centralized security findings
resource "aws_securityhub_account" "autodevai_security_hub" {
  enable_default_standards = true
}

# Enable specific security standards
resource "aws_securityhub_standards_subscription" "aws_foundational" {
  standards_arn = "arn:aws:securityhub:::ruleset/finding-format/aws-foundational-security-standard/v/1.0.0"
  depends_on    = [aws_securityhub_account.autodevai_security_hub]
}

resource "aws_securityhub_standards_subscription" "cis_aws" {
  standards_arn = "arn:aws:securityhub:::ruleset/finding-format/cis-aws-foundations-benchmark/v/1.2.0"
  depends_on    = [aws_securityhub_account.autodevai_security_hub]
}

# Config Rules for security compliance
resource "aws_config_config_rule" "s3_bucket_public_access_prohibited" {
  name = "s3-bucket-public-access-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_ACCESS_PROHIBITED"
  }

  depends_on = [aws_config_configuration_recorder.autodevai_config_recorder]
}

resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.autodevai_config_recorder]
}

resource "aws_config_config_rule" "rds_encrypted" {
  name = "rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  depends_on = [aws_config_configuration_recorder.autodevai_config_recorder]
}

resource "aws_config_config_rule" "security_group_ssh_check" {
  name = "incoming-ssh-disabled"

  source {
    owner             = "AWS"
    source_identifier = "INCOMING_SSH_DISABLED"
  }

  depends_on = [aws_config_configuration_recorder.autodevai_config_recorder]
}

# WAF for web application protection
resource "aws_wafv2_web_acl" "autodevai_waf" {
  name  = "autodevai-waf-${var.environment}"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Block common attacks
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Known bad inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # SQL injection protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "autodevaiWAF"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "autodevai-waf-${var.environment}"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "autodevai_waf_association" {
  resource_arn = aws_lb.autodevai_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.autodevai_waf.arn
}

# CloudWatch metric filters for security monitoring
resource "aws_cloudwatch_log_metric_filter" "suspicious_activity" {
  name           = "suspicious-activity-${var.environment}"
  log_group_name = aws_cloudwatch_log_group.vpc_flow_log.name
  pattern        = "[version, account-id, interface-id, srcaddr != \"10.0.*\", dstaddr, srcport, dstport, protocol, packets, bytes, windowstart, windowend, action=\"REJECT\", flowlogstatus]"

  metric_transformation {
    name      = "SuspiciousActivity"
    namespace = "AutoDevAI/Security"
    value     = "1"
  }
}

# CloudWatch alarm for suspicious activity
resource "aws_cloudwatch_metric_alarm" "suspicious_activity_alarm" {
  alarm_name          = "autodevai-suspicious-activity-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SuspiciousActivity"
  namespace           = "AutoDevAI/Security"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors for suspicious network activity"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  tags = {
    Name = "autodevai-suspicious-activity-alarm-${var.environment}"
  }
}

# SNS topic for security alerts
resource "aws_sns_topic" "security_alerts" {
  name = "autodevai-security-alerts-${var.environment}"

  tags = {
    Name = "autodevai-security-alerts-${var.environment}"
  }
}

# Enable server-side encryption for Config logs bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "config_logs_encryption" {
  bucket = aws_s3_bucket.config_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}