output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.autodevai_vpc.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public_subnets[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private_subnets[*].id
}

output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.autodevai_cluster.id
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.autodevai_cluster.arn
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.autodevai_cluster.endpoint
}

output "eks_cluster_version" {
  description = "EKS cluster version"
  value       = aws_eks_cluster.autodevai_cluster.version
}

output "eks_cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = aws_security_group.eks_cluster_sg.id
}

output "eks_node_group_arn" {
  description = "EKS node group ARN"
  value       = aws_eks_node_group.autodevai_nodes.arn
}

output "eks_node_security_group_id" {
  description = "EKS node security group ID"
  value       = aws_security_group.eks_node_sg.id
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.autodevai_db.id
}

output "rds_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.autodevai_db.endpoint
  sensitive   = true
}

output "rds_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.autodevai_db.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.autodevai_db.db_name
}

output "rds_database_username" {
  description = "RDS database username"
  value       = aws_db_instance.autodevai_db.username
  sensitive   = true
}

output "rds_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = var.environment == "prod" ? aws_db_instance.autodevai_db_replica[0].endpoint : null
  sensitive   = true
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.autodevai_redis.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.autodevai_redis.reader_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.autodevai_redis.port
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = aws_lb.autodevai_alb.dns_name
}

output "load_balancer_zone_id" {
  description = "Load balancer zone ID"
  value       = aws_lb.autodevai_alb.zone_id
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.autodevai_gui.repository_url
}

output "ecr_sandbox_repository_url" {
  description = "ECR sandbox repository URL"
  value       = aws_ecr_repository.autodevai_sandbox.repository_url
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.autodevai_storage.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.autodevai_cdn.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.autodevai_cdn.domain_name
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.autodevai_zone.zone_id
}

output "route53_name_servers" {
  description = "Route53 name servers"
  value       = aws_route53_zone.autodevai_zone.name_servers
}

output "kms_key_id" {
  description = "KMS key ID for encryption"
  value       = aws_kms_key.eks_encryption_key.key_id
}

output "secrets_manager_db_secret_arn" {
  description = "Secrets Manager database secret ARN"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "secrets_manager_redis_secret_arn" {
  description = "Secrets Manager Redis secret ARN"
  value       = aws_secretsmanager_secret.redis_auth_token.arn
}

output "iam_eks_cluster_role_arn" {
  description = "IAM role ARN for EKS cluster"
  value       = aws_iam_role.eks_cluster_role.arn
}

output "iam_eks_node_role_arn" {
  description = "IAM role ARN for EKS nodes"
  value       = aws_iam_role.eks_node_role.arn
}

output "kubectl_config" {
  description = "kubectl configuration"
  value = {
    cluster_name     = aws_eks_cluster.autodevai_cluster.name
    cluster_endpoint = aws_eks_cluster.autodevai_cluster.endpoint
    cluster_ca_data  = aws_eks_cluster.autodevai_cluster.certificate_authority[0].data
    aws_region       = var.aws_region
  }
  sensitive = true
}

output "connection_strings" {
  description = "Database and cache connection strings"
  value = {
    postgres_primary = "postgresql://autodevai:${random_password.db_password.result}@${aws_db_instance.autodevai_db.endpoint}:${aws_db_instance.autodevai_db.port}/autodevai"
    postgres_replica = var.environment == "prod" ? "postgresql://autodevai:${random_password.db_password.result}@${aws_db_instance.autodevai_db_replica[0].endpoint}:${aws_db_instance.autodevai_db_replica[0].port}/autodevai" : null
    redis_primary    = "redis://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.autodevai_redis.primary_endpoint_address}:${aws_elasticache_replication_group.autodevai_redis.port}"
    redis_reader     = "redis://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.autodevai_redis.reader_endpoint_address}:${aws_elasticache_replication_group.autodevai_redis.port}"
  }
  sensitive = true
}

output "monitoring_endpoints" {
  description = "Monitoring service endpoints"
  value = {
    grafana_url    = "https://${var.domain_name}/grafana"
    prometheus_url = "https://${var.domain_name}/prometheus"
  }
}

output "application_urls" {
  description = "Application URLs"
  value = {
    main_app     = "https://${var.domain_name}"
    admin_panel  = "https://${var.domain_name}/admin"
    api_docs     = "https://${var.domain_name}/api/docs"
    health_check = "https://${var.domain_name}/health"
  }
}

output "deployment_commands" {
  description = "Commands to deploy and manage the infrastructure"
  value = {
    configure_kubectl = "aws eks --region ${var.aws_region} update-kubeconfig --name ${aws_eks_cluster.autodevai_cluster.name}"
    apply_manifests   = "kubectl apply -f ../kubernetes/ -R"
    check_pods        = "kubectl get pods -n autodevai"
    check_services    = "kubectl get services -n autodevai"
  }
}