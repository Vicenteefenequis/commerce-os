variable "aws_region" {
  description = "AWS region for the artifacts bucket and lock table"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Globally-unique S3 bucket name holding tfstate/, builds/, and backups/ prefixes"
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name used for Terraform state locking"
  type        = string
  default     = "commerce-os-terraform-locks"
}

variable "builds_retention_days" {
  description = "Expiration for objects under builds/ - paired with count-based pruning in scripts/deploy/upload.sh (keep 5 or 15 days, whichever comes first)"
  type        = number
  default     = 15
}

variable "backups_retention_days" {
  description = "Expiration for objects under backups/ (same 5-or-15-days policy as builds)"
  type        = number
  default     = 15
}
