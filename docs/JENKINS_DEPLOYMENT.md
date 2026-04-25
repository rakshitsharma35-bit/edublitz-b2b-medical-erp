# Jenkins CI/CD Setup Guide

---

## Prerequisites

- Jenkins 2.440+ (LTS)
- Jenkins on Kubernetes (recommended) or standalone
- Git SCM, Pipeline, Kubernetes, AWS Credentials plugins

---

## Step 1 — Install Jenkins (on EKS with Helm)

```bash
# Add Jenkins Helm chart
helm repo add jenkins https://charts.jenkins.io
helm repo update

# Create namespace
kubectl create namespace jenkins

# Install Jenkins
helm install jenkins jenkins/jenkins \
  -n jenkins \
  --set controller.serviceType=LoadBalancer \
  --set controller.adminPassword=changethispassword \
  --set persistence.enabled=true \
  --set persistence.size=20Gi

# Get initial password (if not set above)
kubectl exec -n jenkins svc/jenkins -- cat /run/secrets/chart-admin-password

# Get external IP
kubectl get svc jenkins -n jenkins
```

---

## Step 2 — Install Required Plugins

Navigate to: **Jenkins → Manage Jenkins → Plugins → Available**

Install:
- [x] Pipeline
- [x] Kubernetes
- [x] Git
- [x] GitHub Branch Source
- [x] Docker Pipeline
- [x] Amazon ECR
- [x] AWS Credentials
- [x] Blue Ocean (optional, better UI)
- [x] SonarQube Scanner
- [x] JUnit

---

## Step 3 — Configure Credentials

Navigate to: **Jenkins → Manage Jenkins → Credentials → System → Global**

### AWS Credentials
- **Kind:** AWS Credentials
- **ID:** `AWS_CREDENTIALS`
- **Access Key ID:** `<your-aws-access-key>`
- **Secret Access Key:** `<your-aws-secret-key>`

### SonarCloud Token
- **Kind:** Secret text
- **ID:** `SONARCLOUD_TOKEN`
- **Secret:** `<sonarcloud-api-token>`

### kubeconfig
- **Kind:** Secret file
- **ID:** `KUBECONFIG_CREDENTIAL`
- **File:** Upload your `~/.kube/config` file

### CloudFront Distribution ID
- **Kind:** Secret text
- **ID:** `CLOUDFRONT_DISTRIBUTION_ID`
- **Secret:** `<distribution-id>`

---

## Step 4 — Configure Environment Variables

**Jenkins → Manage Jenkins → System → Global Properties → Environment variables**

| Variable           | Value                                |
|--------------------|--------------------------------------|
| `AWS_ACCOUNT_ID`   | `123456789012`                       |
| `DOMAIN_NAME`      | `yourdomain.com`                     |
| `EKS_CLUSTER`      | `med-erp-prod-eks`                   |

---

## Step 5 — Create Backend Pipeline

1. **New Item** → **Pipeline** → Name: `med-erp-backend`
2. **Definition:** Pipeline script from SCM
3. **SCM:** Git
4. **Repository URL:** `https://github.com/your-org/med-erp.git`
5. **Script Path:** `jenkins/Jenkinsfile.backend`
6. **Branch Specifier:** `*/main`
7. **Save**

---

## Step 6 — Create Frontend Pipeline

1. **New Item** → **Pipeline** → Name: `med-erp-frontend`
2. **Script Path:** `jenkins/Jenkinsfile.frontend`
3. Same SCM settings as above

---

## Step 7 — Create Infrastructure Pipeline

1. **New Item** → **Pipeline** → Name: `med-erp-infrastructure`
2. **Script Path:** `jenkins/Jenkinsfile.infra`
3. This pipeline has **parameters** — run it manually with:
   - `ENVIRONMENT`: `dev` or `prod`
   - `ACTION`: `plan` or `apply`

---

## Step 8 — Set Up GitHub Webhooks

In your GitHub repository settings:
1. **Settings → Webhooks → Add webhook**
2. **Payload URL:** `https://jenkins.yourdomain.com/github-webhook/`
3. **Content type:** `application/json`
4. **Events:** Just the push event

---

## Pipeline Overview

### Backend Pipeline (`Jenkinsfile.backend`)

```
Checkout → Build & Test (parallel) → SonarCloud → Docker Build & Push → Trivy Scan → Deploy to EKS
```

- Runs tests for all 3 services in parallel
- SonarCloud quality gate: blocks deploy if coverage < 80% or bugs found
- Trivy: fails build if HIGH or CRITICAL CVEs found
- Only deploys on `main` branch

### Frontend Pipeline (`Jenkinsfile.frontend`)

```
Checkout → npm install → Lint → Build → Upload to S3 → Invalidate CloudFront
```

- Uploads static assets with immutable cache headers
- `index.html` uploaded with `no-cache` header
- CloudFront invalidation waits for completion

### Infrastructure Pipeline (`Jenkinsfile.infra`)

```
Checkout → Terraform Init → Validate → Plan → [Manual Approval] → Apply
```

- Requires approval from `devops-team` or `tech-lead` before apply
- 30-minute approval timeout
- Separate S3 backends for dev and prod

---

## Troubleshooting

| Issue                              | Fix                                               |
|------------------------------------|---------------------------------------------------|
| Kubernetes plugin agent not starting | Check PodTemplate, namespace, and RBAC           |
| ECR push auth fails                | Verify AWS credentials and ECR permissions        |
| SonarCloud scan fails              | Check SONARCLOUD_TOKEN and project key            |
| Trivy not finding image            | Ensure image was pushed before Trivy stage        |
| kubectl access denied              | KUBECONFIG file must include EKS auth token       |

---

## RBAC for Jenkins Service Account

If Jenkins runs in Kubernetes, give it namespace access:

```bash
kubectl create clusterrolebinding jenkins-deploy \
  --clusterrole=cluster-admin \
  --serviceaccount=jenkins:default
```

> In production, use a least-privilege Role instead of cluster-admin.
