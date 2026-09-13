terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Intentionally local state here - this module creates the bucket and
  # lock table that every other Terraform root (infra/terraform/main)
  # depends on, so it can't depend on its own output as a backend.
}

provider "aws" {
  region = var.aws_region
}
