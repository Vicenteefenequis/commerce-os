output "bucket_name" {
  value = aws_s3_bucket.artifacts.id
}

output "lock_table_name" {
  value = aws_dynamodb_table.tf_locks.name
}

output "aws_region" {
  value = var.aws_region
}
