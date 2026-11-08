resource "aws_iam_role" "app" {
  for_each           = var.create_iam ? local.roles : toset([])
  name               = "${var.project}-${each.key}"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_instance_profile" "app" {
  for_each = aws_iam_role.app
  name     = each.value.name
  role     = each.value.name
}
resource "aws_iam_role_policy_attachment" "ssm" {
  for_each   = aws_iam_role.app
  role       = each.value.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_role_policy" "app" {
  for_each = aws_iam_role.app
  role     = each.value.id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
    { Effect = "Allow", Action = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"], Resource = [for image in values(var.images) : "arn:aws:ecr:${var.region}:${data.aws_caller_identity.current.account_id}:repository/${split("@", join("/", slice(split("/", image), 1, length(split("/", image)))))[0]}"] },
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.app.arn}:*" },
    { Effect = "Allow", Action = ["cloudwatch:PutMetricData"], Resource = "*", Condition = { StringEquals = { "cloudwatch:namespace" = "CWAgent" } } },
    { Effect = "Allow", Action = ["ec2:DescribeTags", "ec2:DescribeVolumes"], Resource = "*" }
    ], each.key == "frontend" ? [] : [
    { Effect = "Allow", Action = ["ssm:GetParameter"], Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.parameters[each.key]}" }
    ], each.key != "frontend" && var.secret_kms_key_arn != "" ? [
    { Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.secret_kms_key_arn }
    ] : [], each.key == "dashboard" ? [
    { Effect = "Allow", Action = ["ec2:DescribeInstances", "autoscaling:DescribeAutoScalingGroups", "autoscaling:DescribeScalingActivities", "elasticloadbalancing:DescribeTargetHealth", "cloudwatch:GetMetricData"], Resource = "*" }
  ] : []) })
}
