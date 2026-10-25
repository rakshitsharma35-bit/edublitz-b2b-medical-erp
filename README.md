# EduBlitz Medical B2B ERP

A B2B medical ERP application for hospitals, distributors, and administrators. The system includes a React frontend, three Spring Boot services, and MongoDB.

## My Contribution: AWS Deployment

I worked on deploying the application through Amazon CloudFront and updating deployment configuration for the hosted environment.

- Frontend delivered through Amazon CloudFront.
- Frontend API configuration uses relative paths for same-origin requests.
- CloudFront distribution routes requests to the appropriate frontend and backend origins.
- Updated Docker and Kubernetes deployment configuration.
- Removed tracked secret files and added them to `.gitignore`.


## Architecture

Users
  │
  ▼
Amazon CloudFront
  ├── Frontend requests ──► S3-hosted React application
  └── API requests ───────► AWS load balancer / Kubernetes ingress
                                ├── user-service
                                ├── product-service
                                └── order-service
                                      │
                                      ▼
                                  MongoDB


## Application Overview

- **user-service:** authentication, users, organizations, and JWT handling
- **product-service:** product catalog and inventory
- **order-service:** order lifecycle and product-service integration
- **frontend:** React single-page application for the ERP workflows

## Technology Stack

- React, Vite, Tailwind CSS, and TanStack Query
- Spring Boot microservices
- MongoDB
- Docker and Kubernetes
- AWS S3 and CloudFront
- Terraform and Jenkins configuration are included in the project

## Repository Structure

frontend/
user-service/
product-service/
order-service/
docker/
k8s/
terraform/
jenkins/
docs/


## Running Locally

See the project guides for local setup and deployment:

- `docs/MANUAL_DEPLOYMENT.md`
- `docs/DOCKER_DEPLOYMENT.md`
- `docs/KUBERNETES_DEPLOYMENT.md`
- `docs/TERRAFORM_DEPLOYMENT.md`

Configure MongoDB and JWT values through environment variables or a secrets manager. Do not commit `.env` files, credentials, or production secrets.

## Security

Never put real credentials or default admin passwords in this README, source control, or container images. Use rotated credentials and store deployment secrets in an appropriate secrets manager.

## License and Ownership

This project is marked proprietary in its existing license. All rights remain with Edublitz / Greamio Technologies Pvt Ltd.
