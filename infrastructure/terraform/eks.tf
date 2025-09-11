# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster_role" {
  name = "autodevai-eks-cluster-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role_policy_attachment" "eks_service_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

# EKS Cluster
resource "aws_eks_cluster" "autodevai_cluster" {
  name     = "${var.cluster_name}-${var.environment}"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = var.cluster_version
  
  vpc_config {
    subnet_ids              = concat(aws_subnet.public_subnets[*].id, aws_subnet.private_subnets[*].id)
    security_group_ids      = [aws_security_group.eks_cluster_sg.id]
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }
  
  encryption_config {
    provider {
      key_arn = aws_kms_key.eks_encryption_key.arn
    }
    resources = ["secrets"]
  }
  
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_service_policy,
    aws_cloudwatch_log_group.eks_cluster_log_group
  ]
  
  tags = {
    Name = "${var.cluster_name}-${var.environment}"
  }
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks_cluster_log_group" {
  name              = "/aws/eks/${var.cluster_name}-${var.environment}/cluster"
  retention_in_days = 7
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks_encryption_key" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true  # Enable key rotation for security
  
  tags = {
    Name = "autodevai-eks-encryption-key-${var.environment}"
  }
}

resource "aws_kms_alias" "eks_encryption_key_alias" {
  name          = "alias/autodevai-eks-${var.environment}"
  target_key_id = aws_kms_key.eks_encryption_key.key_id
}

# EKS Node Group IAM Role
resource "aws_iam_role" "eks_node_role" {
  name = "autodevai-eks-node-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

# Additional policy for CloudWatch and EBS
resource "aws_iam_role_policy" "eks_node_additional_policy" {
  name = "autodevai-eks-node-additional-policy-${var.environment}"
  role = aws_iam_role.eks_node_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "ec2:DescribeVolumes",
          "ec2:DescribeSnapshots",
          "ec2:CreateSnapshot",
          "ec2:CreateTags",
          "ec2:ModifyVolume",
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Launch Template for Node Group
resource "aws_launch_template" "eks_node_template" {
  name_prefix   = "autodevai-node-template-${var.environment}-"
  instance_type = var.node_group_instance_types[0]
  
  vpc_security_group_ids = [aws_security_group.eks_node_sg.id]
  
  # Secure metadata service configuration
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"  # Require IMDSv2
    http_put_response_hop_limit = 1
    instance_metadata_tags = "enabled"
  }
  
  user_data = base64encode(<<-EOF
    #!/bin/bash
    /etc/eks/bootstrap.sh ${aws_eks_cluster.autodevai_cluster.name}
    
    # Secure EC2 metadata service
    echo 'net.ipv4.conf.all.send_redirects = 0' >> /etc/sysctl.conf
    echo 'net.ipv4.conf.default.send_redirects = 0' >> /etc/sysctl.conf
    sysctl -p
    
    # Install additional tools
    yum update -y
    yum install -y docker
    systemctl enable docker
    systemctl start docker
    
    # Install kubectl
    curl -o kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.27.1/2023-04-19/bin/linux/amd64/kubectl
    chmod +x ./kubectl
    mv ./kubectl /usr/local/bin/
    
    # Configure Docker daemon
    cat > /etc/docker/daemon.json <<JSON
    {
      "log-driver": "json-file",
      "log-opts": {
        "max-size": "10m",
        "max-file": "3"
      }
    }
JSON
    systemctl restart docker
  EOF
  )
  
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "autodevai-node-${var.environment}"
    }
  }
  
  tags = {
    Name = "autodevai-node-template-${var.environment}"
  }
}

# EKS Node Group
resource "aws_eks_node_group" "autodevai_nodes" {
  cluster_name    = aws_eks_cluster.autodevai_cluster.name
  node_group_name = "autodevai-nodes-${var.environment}"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private_subnets[*].id
  
  instance_types = var.node_group_instance_types
  ami_type       = "AL2_x86_64"
  capacity_type  = "ON_DEMAND"
  disk_size      = 50
  
  scaling_config {
    desired_size = var.node_group_desired_capacity
    max_size     = var.node_group_max_capacity
    min_size     = var.node_group_min_capacity
  }
  
  update_config {
    max_unavailable_percentage = 25
  }
  
  launch_template {
    id      = aws_launch_template.eks_node_template.id
    version = aws_launch_template.eks_node_template.latest_version
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
  
  tags = {
    Name = "autodevai-nodes-${var.environment}"
  }
}

# EKS Add-ons
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.autodevai_cluster.name
  addon_name   = "vpc-cni"
}

resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.autodevai_cluster.name
  addon_name   = "coredns"
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.autodevai_cluster.name
  addon_name   = "kube-proxy"
}

resource "aws_eks_addon" "ebs_csi" {
  cluster_name = aws_eks_cluster.autodevai_cluster.name
  addon_name   = "aws-ebs-csi-driver"
}

# OIDC Provider for EKS
data "tls_certificate" "eks_cluster" {
  url = aws_eks_cluster.autodevai_cluster.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks_oidc" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks_cluster.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.autodevai_cluster.identity[0].oidc[0].issuer
  
  tags = {
    Name = "autodevai-eks-oidc-${var.environment}"
  }
}