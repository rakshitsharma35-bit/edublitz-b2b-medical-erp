# Terraform Infrastructure

## Module Structure

```
terraform/
├── modules/
│   ├── vpc/            # VPC, subnets, NAT gateways
│   ├── eks/            # EKS cluster, node groups, OIDC
│   ├── ecr/            # Container registries for all services
│   ├── s3-cloudfront/  # Frontend static hosting + CDN
│   └── route53/        # DNS records
└── env/
    ├── dev/            # Development environment (Spot nodes)
    └── prod/           # Production environment (ON_DEMAND nodes)
```

## Bootstrap (first time only)

Create the S3 bucket and DynamoDB table for remote state:

```bash
aws s3 mb s3://med-erp-terraform-state-dev --region us-east-1
aws s3api put-bucket-versioning --bucket med-erp-terraform-state-dev --versioning-configuration Status=Enabled
aws dynamodb create-table \
  --table-name med-erp-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Deploy Dev

```bash
cd terraform/env/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Configure kubectl

```bash
aws eks update-kubeconfig --region us-east-1 --name med-erp-dev-eks
kubectl get nodes
```
