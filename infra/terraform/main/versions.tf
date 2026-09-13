terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend location depends on the bootstrap module's output (bucket
  # name is chosen at bootstrap time, not hardcoded) - supply it via
  # `terraform init -backend-config=backend.hcl` using the bucket/table
  # names from `terraform output` in ../bootstrap. See backend.hcl.example.
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}
