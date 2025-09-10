terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "autodevai"
      ManagedBy   = "terraform"
    }
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Configuration
resource "aws_vpc" "autodevai_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "autodevai-vpc-${var.environment}"
  }
}

# VPC Flow Logs for security monitoring
resource "aws_flow_log" "autodevai_vpc_flow_log" {
  iam_role_arn    = aws_iam_role.flow_log_role.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.autodevai_vpc.id

  tags = {
    Name = "autodevai-vpc-flow-log-${var.environment}"
  }
}

# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  name              = "/aws/vpc/flowlogs-${var.environment}"
  retention_in_days = 30
  
  tags = {
    Name = "autodevai-vpc-flow-logs-${var.environment}"
  }
}

# IAM role for VPC Flow Logs
resource "aws_iam_role" "flow_log_role" {
  name = "autodevai-flow-log-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "autodevai-flow-log-role-${var.environment}"
  }
}

# IAM policy for VPC Flow Logs
resource "aws_iam_role_policy" "flow_log_policy" {
  name = "autodevai-flow-log-policy-${var.environment}"
  role = aws_iam_role.flow_log_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Internet Gateway
resource "aws_internet_gateway" "autodevai_igw" {
  vpc_id = aws_vpc.autodevai_vpc.id
  
  tags = {
    Name = "autodevai-igw-${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnets" {
  count             = 3
  vpc_id            = aws_vpc.autodevai_vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  map_public_ip_on_launch = false  # Removed public IP assignment for security
  
  tags = {
    Name = "autodevai-public-${count.index + 1}-${var.environment}"
    Type = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private_subnets" {
  count             = 3
  vpc_id            = aws_vpc.autodevai_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "autodevai-private-${count.index + 1}-${var.environment}"
    Type = "private"
  }
}

# NAT Gateways
resource "aws_eip" "nat_eips" {
  count  = 3
  domain = "vpc"
  
  tags = {
    Name = "autodevai-nat-eip-${count.index + 1}-${var.environment}"
  }
}

resource "aws_nat_gateway" "nat_gateways" {
  count         = 3
  allocation_id = aws_eip.nat_eips[count.index].id
  subnet_id     = aws_subnet.public_subnets[count.index].id
  
  tags = {
    Name = "autodevai-nat-${count.index + 1}-${var.environment}"
  }
}

# Route Tables
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.autodevai_vpc.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.autodevai_igw.id
  }
  
  tags = {
    Name = "autodevai-public-rt-${var.environment}"
  }
}

resource "aws_route_table" "private_rts" {
  count  = 3
  vpc_id = aws_vpc.autodevai_vpc.id
  
  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gateways[count.index].id
  }
  
  tags = {
    Name = "autodevai-private-rt-${count.index + 1}-${var.environment}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public_rta" {
  count          = 3
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "private_rta" {
  count          = 3
  subnet_id      = aws_subnet.private_subnets[count.index].id
  route_table_id = aws_route_table.private_rts[count.index].id
}

# Security Groups
resource "aws_security_group" "eks_cluster_sg" {
  name        = "autodevai-eks-cluster-sg-${var.environment}"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.autodevai_vpc.id
  
  # Restrict HTTPS access to specific IP ranges for better security
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "HTTPS access from allowed CIDR blocks"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "autodevai-eks-cluster-sg-${var.environment}"
  }
}

resource "aws_security_group" "eks_node_sg" {
  name        = "autodevai-eks-node-sg-${var.environment}"
  description = "Security group for EKS nodes"
  vpc_id      = aws_vpc.autodevai_vpc.id
  
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }
  
  # SSH access only from within VPC
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "SSH access from within VPC only"
  }
  
  # HTTP access through ALB only
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "HTTP access from ALB only"
  }
  
  # HTTPS access through ALB only
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "HTTPS access from ALB only"
  }
  
  # Custom application port - restrict to ALB only
  ingress {
    from_port       = 50060
    to_port         = 50060
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "Custom app port access from ALB only"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "autodevai-eks-node-sg-${var.environment}"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "autodevai-rds-sg-${var.environment}"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.autodevai_vpc.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_node_sg.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "autodevai-rds-sg-${var.environment}"
  }
}

resource "aws_security_group" "elasticache_sg" {
  name        = "autodevai-elasticache-sg-${var.environment}"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.autodevai_vpc.id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_node_sg.id]
    description     = "Redis access from EKS nodes only"
  }
  
  # Explicit egress rule (default allows all, but explicit is better)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"]
    description = "Outbound to VPC only"
  }
  
  tags = {
    Name = "autodevai-elasticache-sg-${var.environment}"
  }
}