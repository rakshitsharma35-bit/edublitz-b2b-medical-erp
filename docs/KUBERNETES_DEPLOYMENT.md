# Kubernetes / EKS Deployment Guide

---

## Prerequisites

- `kubectl` 1.28+
- `helm` 3.x
- AWS CLI configured with sufficient IAM permissions
- EKS cluster running (see TERRAFORM_DEPLOYMENT.md)
- Images pushed to ECR

---

## Step 1 — Configure kubectl

```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name med-erp-prod-eks

# Verify connection
kubectl get nodes
```

---

## Step 2 — Install AWS Load Balancer Controller

```bash
# Add Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install ALB controller (uses IRSA)
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=med-erp-prod-eks \
  --set serviceAccount.create=true \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::ACCOUNT_ID:role/AWSLoadBalancerControllerIAMRole

# Verify
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
kubectl get ingressclass
```

---

## Step 3 — Update Image References

Edit the deployment YAMLs to point to your ECR registry:
```bash
ECR_REGISTRY="123456789012.dkr.ecr.us-east-1.amazonaws.com"
IMAGE_TAG="v1.0.0"

# Replace placeholder in all deployment files
find k8s/deployments/ -name "*.yaml" -exec \
  sed -i "s|YOUR_ECR_REGISTRY|$ECR_REGISTRY|g; s|:latest|:$IMAGE_TAG|g" {} \;
```

---

## Step 4 — Configure Secrets

**Never commit real values to Git.** Populate secrets:

```bash
# MongoDB Atlas connection strings
kubectl create secret generic app-secrets \
  -n med-erp \
  --from-literal=MONGODB_URI_USER="mongodb+srv://..." \
  --from-literal=MONGODB_URI_PRODUCT="mongodb+srv://..." \
  --from-literal=MONGODB_URI_ORDER="mongodb+srv://..." \
  --from-literal=JWT_SECRET="your-256-bit-hex-secret" \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

## Step 5 — Apply All Manifests

```bash
# Create namespace first
kubectl apply -f k8s/namespace/

# ConfigMaps (no secrets here)
kubectl apply -f k8s/configmaps/

# Deployments and Services
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/

# Horizontal Pod Autoscalers
kubectl apply -f k8s/hpa/

# AWS ALB Ingress — update certificate ARN and SG first
# Edit k8s/ingress/ingress.yaml:
#   alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:...
#   alb.ingress.kubernetes.io/security-groups: sg-...
# Applies IngressClass "alb" + Ingress (spec.ingressClassName: alb)
kubectl apply -f k8s/ingress/
```

---

## Step 6 — Verify Deployment

```bash
# Check pod status (all should be Running)
kubectl get pods -n med-erp

# Check services
kubectl get svc -n med-erp

# Get ALB DNS name
kubectl get ingress -n med-erp
# Note the ADDRESS — use it for Route53 CNAME

# Watch rollout
kubectl rollout status deployment/user-service -n med-erp
kubectl rollout status deployment/product-service -n med-erp
kubectl rollout status deployment/order-service -n med-erp
```

---

## Useful kubectl Commands

```bash
# View logs
kubectl logs -f deployment/user-service -n med-erp --tail=100

# Scale manually
kubectl scale deployment/product-service --replicas=3 -n med-erp

# Rolling restart
kubectl rollout restart deployment/order-service -n med-erp

# Exec into a pod
kubectl exec -it $(kubectl get pods -n med-erp -l app=user-service -o name | head -1) \
  -n med-erp -- sh

# View HPA status
kubectl get hpa -n med-erp

# Describe ingress (shows ALB events)
kubectl describe ingress med-erp-ingress -n med-erp
```

---

## Rolling Update (New Image)

```bash
# Update image in a running deployment
kubectl set image deployment/user-service \
  user-service=123456789012.dkr.ecr.us-east-1.amazonaws.com/med-erp/user-service:v1.1.0 \
  -n med-erp

# Watch rollout
kubectl rollout status deployment/user-service -n med-erp

# Rollback if needed
kubectl rollout undo deployment/user-service -n med-erp
```

---

## Troubleshooting

| Issue                          | Debug Command                                     |
|--------------------------------|---------------------------------------------------|
| Pod in CrashLoopBackOff        | `kubectl logs <pod> -n med-erp --previous`        |
| Pod in Pending                 | `kubectl describe pod <pod> -n med-erp`           |
| Ingress has no ADDRESS         | Check ALB controller logs in kube-system ns       |
| Service not reachable          | Check `kubectl describe svc <svc> -n med-erp`     |
| Secret missing                 | `kubectl get secret app-secrets -n med-erp`       |
