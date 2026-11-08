data "aws_availability_zones" "available" {
  state = "available"
}
data "aws_caller_identity" "current" {}
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-x86_64"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}
locals {
  roles    = toset(["backend", "frontend", "dashboard"])
  asg_name = "${var.project}-backend"
  parameters = { backend = var.backend_parameter_name, dashboard = var.dashboard_parameter_name
  }
  parameter_arns = [for name in values(local.parameters) : "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${startswith(name, "/") ? name : "/${name}"}"]
  public_url     = "https://${var.public_hostname}"
  configs = { for role in local.roles : role => {
    role             = role, region = var.region, images = var.images, enable_compute = var.enable_compute,
    secret_parameter = lookup(local.parameters, role, ""), asg_name = local.asg_name,
    target_group_arn = aws_lb_target_group.backend.arn, load_balancer_arn = aws_lb.main.arn,
    log_group        = aws_cloudwatch_log_group.app.name, public_url = local.public_url

    }
  }
  cloudwatch = {
    agent = { metrics_collection_interval = 60, run_as_user = "root"
    }
    metrics = {
      namespace = "CWAgent"
      append_dimensions = { InstanceId = "$${aws:InstanceId}", AutoScalingGroupName = "$${aws:AutoScalingGroupName}"
      }
      metrics_collected = { mem = { measurement = ["mem_used", "mem_used_percent"], metrics_collection_interval = 60
        }
      }

    }

  }
  user_data = { for role in local.roles : role => base64encode(templatefile("${path.module}/../aws/user-data.sh.tftpl", {
    config_b64         = base64encode(jsonencode(local.configs[role])),
    bootstrap_b64      = filebase64("${path.module}/../aws/bootstrap.py"),
    dashboard_conf_b64 = filebase64("${path.module}/../aws/dashboard.conf"),
    agent_b64          = base64encode(jsonencode(role == "backend" ? local.cloudwatch : merge(local.cloudwatch, { metrics = merge(local.cloudwatch.metrics, { append_dimensions = { InstanceId = "$${aws:InstanceId}" } }) })))
    }))
  }
}
resource "aws_vpc" "main" {
  cidr_block           = "10.47.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = var.project
  }
}
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  cidr_block              = "10.47.${count.index + 1}.0/24"
  map_public_ip_on_launch = true
  tags = { Name = "${var.project}-public-${count.index + 1}"
  }
}
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
resource "aws_security_group" "alb" {
  name_prefix = "${var.project}-alb-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_security_group" "app" {
  for_each    = local.roles
  name_prefix = "${var.project}-${each.key}-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port       = each.key == "backend" ? 5000 : 80
    to_port         = each.key == "backend" ? 5000 : 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_cloudwatch_log_group" "app" {
  name              = "/it457/${var.project}"
  retention_in_days = 7
}
resource "aws_lb" "main" {
  name                       = var.project
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = aws_subnet.public[*].id
  drop_invalid_header_fields = true
}
resource "aws_lb_target_group" "backend" {
  name                 = "${var.project}-backend"
  port                 = 5000
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 15
  health_check {
    path                = "/api/health"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }
}
resource "aws_lb_target_group" "web" {
  for_each = toset(["frontend", "dashboard"])
  name     = "${var.project}-${each.key}"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path    = "/healthz"
    matcher = "200"
  }
}
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.certificate_arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web["frontend"].arn
  }
}
resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}
resource "aws_lb_listener_rule" "dashboard" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web["dashboard"].arn
  }
  condition {
    path_pattern {
      values = ["/dashboard", "/dashboard/*", "/monitoring-api/*"]
    }
  }
}
resource "aws_launch_template" "backend" {
  name_prefix            = "${var.project}-backend-"
  image_id               = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.app["backend"].id]
  iam_instance_profile {
    name = var.create_iam ? aws_iam_instance_profile.app["backend"].name : var.existing_instance_profile
  }
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
  monitoring {
    enabled = true
  }
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 12
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }
  user_data = local.user_data.backend
  tag_specifications {
    resource_type = "instance"
    tags = { Name = "${var.project}-backend", Project = var.project
    }
  }
  lifecycle {
    precondition {
      condition     = var.create_iam || length(var.existing_instance_profile) > 0
      error_message = "Restricted-lab mode requires an approved existing instance profile."
    }

  }
}
resource "aws_autoscaling_group" "backend" {
  name                      = local.asg_name
  min_size                  = 1
  max_size                  = 3
  desired_capacity          = 1
  vpc_zone_identifier       = aws_subnet.public[*].id
  target_group_arns         = [aws_lb_target_group.backend.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 600
  default_instance_warmup   = 180
  launch_template {
    id      = aws_launch_template.backend.id
    version = aws_launch_template.backend.latest_version
  }
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      max_healthy_percentage = 100
    }
  }
  tag {
    key                 = "Name"
    value               = "${var.project}-backend"
    propagate_at_launch = true
  }
  lifecycle {
    ignore_changes = [desired_capacity]
  }
  depends_on = [aws_route_table_association.public, aws_lb_listener.https, aws_iam_role_policy.app]
}
resource "aws_autoscaling_policy" "cpu" {
  name                   = "${var.project}-cpu"
  autoscaling_group_name = aws_autoscaling_group.backend.name
  policy_type            = "TargetTrackingScaling"
  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = var.cpu_target

  }
}
resource "aws_instance" "web" {
  for_each               = toset(["frontend", "dashboard"])
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[each.key == "frontend" ? 0 : 1].id
  vpc_security_group_ids = [aws_security_group.app[each.key].id]
  iam_instance_profile   = var.create_iam ? aws_iam_instance_profile.app[each.key].name : var.existing_instance_profile
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
  root_block_device {
    volume_size = 12
    volume_type = "gp3"
    encrypted   = true
  }
  user_data_base64            = local.user_data[each.key]
  user_data_replace_on_change = true
  tags = { Name = "${var.project}-${each.key}"
  }
  depends_on = [aws_route_table_association.public, aws_iam_role_policy.app]
}
resource "aws_lb_target_group_attachment" "web" {
  for_each         = aws_instance.web
  target_group_arn = aws_lb_target_group.web[each.key].arn
  target_id        = each.value.id
  port             = 80
}
