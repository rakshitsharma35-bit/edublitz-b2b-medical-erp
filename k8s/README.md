# Kubernetes Deployment Guide

## Apply order (respect dependencies)

```bash
# 1. Namespace
kubectl apply -f namespace/

# 2. Config
kubectl apply -f configmaps/
kubectl apply -f secrets/

# 3. Workloads
kubectl apply -f deployments/
kubectl apply -f services/

# 4. Autoscaling
kubectl apply -f hpa/

# 5. AWS ALB Ingress (after AWS Load Balancer Controller is installed)
#    ingressclass.yaml + ingress.yaml (ALB via ingressClassName: alb)
kubectl apply -f ingress/
```

## Check status

```bash
kubectl get pods -n med-erp
kubectl get svc  -n med-erp
kubectl get ingress -n med-erp
```

## Image substitution

Replace `YOUR_ECR_REGISTRY` in deployment YAMLs with your actual ECR registry URL:
```
123456789012.dkr.ecr.us-east-1.amazonaws.com
```
