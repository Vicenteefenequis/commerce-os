resource "aws_instance" "app" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  key_name                    = var.ssh_key_name
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = aws_iam_instance_profile.app_instance.name
  associate_public_ip_address = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size_gb
  }

  user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    artifacts_bucket = var.artifacts_bucket_name
  })

  tags = {
    Name = "${var.project_name}-app"
  }
}
