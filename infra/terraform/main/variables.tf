variable "aws_region" {
  description = "AWS region for the app instance"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used to prefix resource names/tags"
  type        = string
  default     = "commerce-os"
}

variable "instance_type" {
  description = "EC2 instance type - t3.micro to stay within free-credit-friendly cost"
  type        = string
  default     = "t3.micro"
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size - holds Docker images/tarballs and Postgres data"
  type        = number
  default     = 20
}

variable "ssh_allowed_cidr" {
  description = "CIDR allowed to SSH (operator's current IP, e.g. 203.0.113.4/32) - updated manually on request, not automated"
  type        = string
}

variable "ssh_key_name" {
  description = "Name of an existing EC2 key pair (created out-of-band) used for SSH access"
  type        = string
}

variable "artifacts_bucket_name" {
  description = "Name of the S3 bucket created by the bootstrap module (../bootstrap output: bucket_name)"
  type        = string
}

variable "billing_alert_email" {
  description = "Email address to receive billing alarm notifications"
  type        = string
}

variable "billing_alarm_thresholds_usd" {
  description = "Estimated-charge thresholds (USD) that each trigger their own CloudWatch alarm"
  type        = list(number)
  default     = [10, 15, 20]
}
