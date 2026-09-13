# Prerequisite this module cannot enforce: "Receive Billing Alerts" must
# be turned on manually once, in the account's Billing preferences
# (My Account -> Billing Preferences) - it's an account-level console
# setting, not a Terraform-managed resource. Without it, the
# AWS/Billing EstimatedCharges metric never populates and these alarms
# stay in INSUFFICIENT_DATA forever.

resource "aws_sns_topic" "billing_alerts" {
  name = "${var.project_name}-billing-alerts"
}

resource "aws_sns_topic_subscription" "billing_alerts_email" {
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.billing_alert_email
}

resource "aws_cloudwatch_metric_alarm" "billing" {
  for_each = toset([for t in var.billing_alarm_thresholds_usd : tostring(t)])

  alarm_name          = "${var.project_name}-billing-gte-${each.value}usd"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600 # 6h - the billing metric only updates a few times/day
  statistic           = "Maximum"
  threshold           = tonumber(each.value)
  alarm_description   = "Estimated AWS charges have reached ${each.value} USD"
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    Currency = "USD"
  }
}
