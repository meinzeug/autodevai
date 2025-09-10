# Load Balancer
resource "aws_lb" "autodevai_alb" {
  name               = "autodevai-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public_subnets[*].id
  
  enable_deletion_protection = var.environment == "prod" ? true : false
  
  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb-logs"
    enabled = true
  }
  
  tags = {
    Name = "autodevai-alb-${var.environment}"
  }
}

# ALB Security Group
resource "aws_security_group" "alb_sg" {
  name        = "autodevai-alb-sg-${var.environment}"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.autodevai_vpc.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 50060
    to_port     = 50060
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "autodevai-alb-sg-${var.environment}"
  }
}

# S3 Bucket for ALB Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket = "autodevai-alb-logs-${var.environment}-${random_string.bucket_suffix.result}"
  
  tags = {
    Name = "autodevai-alb-logs-${var.environment}"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs_lifecycle" {
  bucket = aws_s3_bucket.alb_logs.id
  
  rule {
    id     = "alb_logs_lifecycle"
    status = "Enabled"
    
    expiration {
      days = 30
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# Random string for bucket suffix
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket for Application Storage
resource "aws_s3_bucket" "autodevai_storage" {
  bucket = "autodevai-storage-${var.environment}-${random_string.bucket_suffix.result}"
  
  tags = {
    Name = "autodevai-storage-${var.environment}"
  }
}

resource "aws_s3_bucket_versioning" "autodevai_storage_versioning" {
  bucket = aws_s3_bucket.autodevai_storage.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "autodevai_storage_encryption" {
  bucket = aws_s3_bucket.autodevai_storage.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_encryption_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# KMS Key for S3 encryption
resource "aws_kms_key" "s3_encryption_key" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true  # Enable key rotation for security
  
  tags = {
    Name = "autodevai-s3-encryption-key-${var.environment}"
  }
}

resource "aws_kms_alias" "s3_encryption_key_alias" {
  name          = "alias/autodevai-s3-${var.environment}"
  target_key_id = aws_kms_key.s3_encryption_key.key_id
}

# ECR Repository for GUI
resource "aws_ecr_repository" "autodevai_gui" {
  name                 = "autodevai/gui"
  image_tag_mutability = "IMMUTABLE"  # Changed to IMMUTABLE for security
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  encryption_configuration {
    encryption_type = "AES256"
  }
  
  tags = {
    Name        = "autodevai-gui-${var.environment}"
    Environment = var.environment
    Service     = "gui"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "autodevai_gui_policy" {
  repository = aws_ecr_repository.autodevai_gui.name
  
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR Repository for Sandbox Manager
resource "aws_ecr_repository" "autodevai_sandbox" {
  name                 = "autodevai/sandbox-manager"
  image_tag_mutability = "IMMUTABLE"  # Changed to IMMUTABLE for security
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  encryption_configuration {
    encryption_type = "AES256"
  }
  
  tags = {
    Name        = "autodevai-sandbox-${var.environment}"
    Environment = var.environment
    Service     = "sandbox-manager"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "autodevai_sandbox_policy" {
  repository = aws_ecr_repository.autodevai_sandbox.name
  
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Route53 Hosted Zone
resource "aws_route53_zone" "autodevai_zone" {
  name = var.domain_name
  
  tags = {
    Name = "autodevai-zone-${var.environment}"
  }
}

# Route53 Records
resource "aws_route53_record" "autodevai_a" {
  zone_id = aws_route53_zone.autodevai_zone.zone_id
  name    = var.domain_name
  type    = "A"
  
  alias {
    name                   = aws_lb.autodevai_alb.dns_name
    zone_id                = aws_lb.autodevai_alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "autodevai_www" {
  zone_id = aws_route53_zone.autodevai_zone.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = aws_lb.autodevai_alb.dns_name
    zone_id                = aws_lb.autodevai_alb.zone_id
    evaluate_target_health = true
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "autodevai_cdn" {
  origin {
    domain_name = aws_lb.autodevai_alb.dns_name
    origin_id   = "ALB-${aws_lb.autodevai_alb.name}"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  enabled = true
  
  aliases = [var.domain_name, "www.${var.domain_name}"]
  
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${aws_lb.autodevai_alb.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization", "CloudFront-Forwarded-Proto"]
      
      cookies {
        forward = "all"
      }
    }
    
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }
  
  # Cache behavior for API endpoints
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${aws_lb.autodevai_alb.name}"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }
  
  price_class = "PriceClass_100"
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn != "" ? var.certificate_arn : aws_acm_certificate.autodevai_cert[0].arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  tags = {
    Name = "autodevai-cdn-${var.environment}"
  }
}

# ACM Certificate
resource "aws_acm_certificate" "autodevai_cert" {
  count = var.certificate_arn == "" ? 1 : 0
  
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Name = "autodevai-cert-${var.environment}"
  }
}

# Certificate validation
resource "aws_route53_record" "autodevai_cert_validation" {
  for_each = var.certificate_arn == "" ? {
    for dvo in aws_acm_certificate.autodevai_cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.autodevai_zone.zone_id
}

resource "aws_acm_certificate_validation" "autodevai_cert" {
  count = var.certificate_arn == "" ? 1 : 0
  
  certificate_arn         = aws_acm_certificate.autodevai_cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.autodevai_cert_validation : record.fqdn]
}