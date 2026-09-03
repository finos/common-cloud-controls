data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  name_main = "finos-ccc-integration-k8s-main"
  name_bad  = "finos-ccc-integration-k8s-bad"
  azs       = slice(data.aws_availability_zones.available.names, 0, 2)

  cluster_tags = merge(var.common_tags, {
    CFIControlSet      = "CCC.K8S"
    Owner              = "finos-ccc"
    Environment        = "nonprod"
    DataClassification = "internal"
  })

  # Fixture metadata consumed by privateer / cloud-api configs.
  fixture_metadata = {
    test_workload_namespace               = "ccc-test"
    test_workload_service_account         = "ccc-wi-sa"
    test_workload_service_account_unbound = "ccc-wi-sa-unbound"
    network_control_namespace             = "ccc-network-control"
    protected_secret_name                 = "ccc-protected-secret"
    unrelated_secret_name                 = "ccc-unrelated-secret"
    approved_storage_class                = "ccc-approved-sc"
    disallowed_storage_class              = "ccc-blocked-sc"
    approved_access_mode                  = "ReadWriteOnce"
    disallowed_access_mode                = "ReadWriteMany"
    required_metadata_keys                = ["Owner", "Environment", "DataClassification"]
  }
}

# Dedicated VPC shared by main + bad clusters (one NAT) — cheaper than two VPCs.
resource "aws_vpc" "k8s" {
  cidr_block           = "10.80.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.cluster_tags, {
    Name = "finos-ccc-integration-k8s-vpc"
  })
}

resource "aws_internet_gateway" "k8s" {
  vpc_id = aws_vpc.k8s.id
  tags = merge(local.cluster_tags, {
    Name = "finos-ccc-integration-k8s-igw"
  })
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.k8s.id
  cidr_block              = cidrsubnet(aws_vpc.k8s.cidr_block, 4, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.cluster_tags, {
    Name                     = "finos-ccc-integration-k8s-public-${count.index}"
    "kubernetes.io/role/elb" = "1"
  })
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.k8s.id
  cidr_block        = cidrsubnet(aws_vpc.k8s.cidr_block, 4, count.index + 8)
  availability_zone = local.azs[count.index]

  tags = merge(local.cluster_tags, {
    Name                              = "finos-ccc-integration-k8s-private-${count.index}"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags = merge(local.cluster_tags, {
    Name = "finos-ccc-integration-k8s-nat-eip"
  })
}

resource "aws_nat_gateway" "k8s" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags = merge(local.cluster_tags, {
    Name = "finos-ccc-integration-k8s-nat"
  })
  depends_on = [aws_internet_gateway.k8s]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.k8s.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.k8s.id
  }
  tags = merge(local.cluster_tags, { Name = "finos-ccc-integration-k8s-public-rt" })
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.k8s.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.k8s.id
  }
  tags = merge(local.cluster_tags, { Name = "finos-ccc-integration-k8s-private-rt" })
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_kms_key" "secrets" {
  description             = "EKS secrets encryption for ${local.name_main}"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = local.cluster_tags
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/finos-ccc-integration-k8s-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "aws_cloudwatch_log_group" "main" {
  name              = "/aws/eks/${local.name_main}/cluster"
  retention_in_days = 7
  tags              = local.cluster_tags
}

resource "aws_cloudwatch_log_group" "bad" {
  name              = "/aws/eks/${local.name_bad}/cluster"
  retention_in_days = 7
  tags              = local.cluster_tags
}

resource "aws_iam_role" "cluster" {
  name = "finos-ccc-integration-k8s-cluster"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = local.cluster_tags
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role" "node" {
  name = "finos-ccc-integration-k8s-node"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = local.cluster_tags
}

resource "aws_iam_role_policy_attachment" "node_worker" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "node_cni" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "node_ecr" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role" "vpc_cni" {
  name = "finos-ccc-integration-k8s-vpc-cni"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.main.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.main.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(aws_iam_openid_connect_provider.main.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-node"
        }
      }
    }]
  })
  tags = local.cluster_tags

  depends_on = [aws_iam_openid_connect_provider.main]
}

resource "aws_iam_role_policy_attachment" "vpc_cni" {
  role       = aws_iam_role.vpc_cni.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role" "ebs_csi" {
  name = "finos-ccc-integration-k8s-ebs-csi"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.main.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.main.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(aws_iam_openid_connect_provider.main.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })
  tags = local.cluster_tags
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  role       = aws_iam_role.ebs_csi.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

# Compliant MAIN cluster: private+CIDR-locked public API, secrets encryption, logging.
resource "aws_eks_cluster" "main" {
  name     = local.name_main
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.api_authorized_cidrs
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  encryption_config {
    provider {
      key_arn = aws_kms_key.secrets.arn
    }
    resources = ["secrets"]
  }

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  tags = merge(local.cluster_tags, {
    Name = local.name_main
  })

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_cloudwatch_log_group.main,
  ]
}

# Bottlerocket AMI for CN18 boot-integrity; SPOT + single node for cost.
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.private[*].id
  capacity_type   = "SPOT"
  ami_type        = "BOTTLEROCKET_x86_64"
  instance_types  = var.node_instance_types

  scaling_config {
    desired_size = 1
    min_size     = 1
    max_size     = 2
  }

  labels = {
    Environment        = "nonprod"
    Owner              = "finos-ccc"
    DataClassification = "internal"
  }

  tags = merge(local.cluster_tags, {
    Name = "${local.name_main}-ng"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_ecr,
  ]
}

resource "aws_eks_addon" "vpc_cni" {
  cluster_name                = aws_eks_cluster.main.name
  addon_name                  = "vpc-cni"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  service_account_role_arn    = aws_iam_role.vpc_cni.arn
  tags                        = local.cluster_tags
}

resource "aws_eks_addon" "coredns" {
  cluster_name                = aws_eks_cluster.main.name
  addon_name                  = "coredns"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  tags                        = local.cluster_tags
  depends_on                  = [aws_eks_node_group.main]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name                = aws_eks_cluster.main.name
  addon_name                  = "kube-proxy"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  tags                        = local.cluster_tags
}

resource "aws_eks_addon" "ebs_csi" {
  cluster_name                = aws_eks_cluster.main.name
  addon_name                  = "aws-ebs-csi-driver"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  service_account_role_arn    = aws_iam_role.ebs_csi.arn
  tags                        = local.cluster_tags
  depends_on                  = [aws_eks_node_group.main]
}

data "tls_certificate" "main" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "main" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.main.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
  tags            = local.cluster_tags
}

# Non-compliant BAD cluster: open public API for CN01 negatives.
resource "aws_eks_cluster" "bad" {
  name     = local.name_bad
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  enabled_cluster_log_types = ["api", "audit"]

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  tags = merge(local.cluster_tags, {
    Name    = local.name_bad
    CFIRole = "bad"
  })

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_cloudwatch_log_group.bad,
  ]
}

resource "aws_eks_node_group" "bad" {
  cluster_name    = aws_eks_cluster.bad.name
  node_group_name = "bad"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.public[*].id
  capacity_type   = "SPOT"
  instance_types  = var.node_instance_types

  scaling_config {
    desired_size = 1
    min_size     = 1
    max_size     = 1
  }

  tags = merge(local.cluster_tags, {
    Name    = "${local.name_bad}-ng"
    CFIRole = "bad"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_ecr,
  ]
}

# WI probe bucket + IRSA for bound SA (CN03.AR01).
resource "aws_s3_bucket" "wi_probe" {
  bucket = var.wi_probe_bucket_name
  tags = merge(local.cluster_tags, {
    Name = var.wi_probe_bucket_name
  })
}

resource "aws_s3_bucket_public_access_block" "wi_probe" {
  bucket                  = aws_s3_bucket.wi_probe.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "wi_probe" {
  bucket  = aws_s3_bucket.wi_probe.id
  key     = "probe.txt"
  content = "ccc-wi-probe-ok"
}

resource "aws_iam_role" "wi_bound" {
  name = "finos-ccc-integration-k8s-wi-bound"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.main.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.main.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(aws_iam_openid_connect_provider.main.url, "https://", "")}:sub" = "system:serviceaccount:${local.fixture_metadata.test_workload_namespace}:${local.fixture_metadata.test_workload_service_account}"
        }
      }
    }]
  })
  tags = local.cluster_tags
}

resource "aws_iam_role_policy" "wi_bound_s3" {
  name = "wi-probe-read"
  role = aws_iam_role.wi_bound.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = [aws_s3_bucket.wi_probe.arn, "${aws_s3_bucket.wi_probe.arn}/*"]
    }]
  })
}
