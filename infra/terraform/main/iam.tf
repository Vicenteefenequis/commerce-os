data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app_instance" {
  name               = "${var.project_name}-app-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Minimal blast radius: the instance can only read release tarballs
# (deploy.sh/rollback.sh pull them at deploy time) and write its own
# pg_dump backups. It can never touch tfstate/, list the bucket root, or
# write/delete anything under builds/ - that's the operator's local
# credentials' job (scripts/deploy/upload.sh), not the instance's.
data "aws_iam_policy_document" "app_instance" {
  statement {
    sid       = "ReadBuilds"
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${var.artifacts_bucket_name}/builds/*"]
  }

  statement {
    sid       = "WriteBackups"
    actions   = ["s3:PutObject"]
    resources = ["arn:aws:s3:::${var.artifacts_bucket_name}/backups/*"]
  }

  statement {
    sid       = "ListOwnPrefixesOnly"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.artifacts_bucket_name}"]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["builds/*", "backups/*"]
    }
  }
}

resource "aws_iam_role_policy" "app_instance" {
  name   = "${var.project_name}-app-instance-s3"
  role   = aws_iam_role.app_instance.id
  policy = data.aws_iam_policy_document.app_instance.json
}

resource "aws_iam_instance_profile" "app_instance" {
  name = "${var.project_name}-app-instance"
  role = aws_iam_role.app_instance.name
}
