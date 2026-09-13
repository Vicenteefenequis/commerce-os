output "instance_id" {
  value = aws_instance.app.id
}

output "elastic_ip" {
  value = aws_eip.app.public_ip
}

output "app_hostname" {
  description = "sslip.io hostname Caddy issues its certificate for - tied to the Elastic IP"
  value       = "${aws_eip.app.public_ip}.sslip.io"
}
