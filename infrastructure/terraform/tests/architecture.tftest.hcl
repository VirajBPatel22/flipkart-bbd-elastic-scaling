mock_provider "aws" {
  override_during = plan
  mock_data "aws_availability_zones" {
    defaults = { names = ["ap-south-1a", "ap-south-1b"]
    }
  }
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012"
    }
  }
  mock_data "aws_ami" {
    defaults = { id = "ami-0123456789abcdef0"
    }
  }
}
override_resource {
  target          = aws_lb.main
  override_during = plan
  values          = { arn = "arn:aws:elasticloadbalancing:ap-south-1:123456789012:loadbalancer/app/bbd-it457/1234567890123456" }
}
override_resource {
  target          = aws_lb_target_group.backend
  override_during = plan
  values          = { arn = "arn:aws:elasticloadbalancing:ap-south-1:123456789012:targetgroup/bbd-it457-backend/1234567890123456" }
}
variables {
  public_hostname = "bbd.example.com"
  certificate_arn = "arn:aws:acm:ap-south-1:123456789012:certificate/11111111-1111-1111-1111-111111111111"
  allowed_cidrs   = ["203.0.113.10/32"]
  images = {
    frontend   = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bbd/frontend@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    backend    = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bbd/backend@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    dashboard  = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bbd/dashboard@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    monitoring = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bbd/monitoring@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

  }
}
run "bounded_scaling_and_secure_boot" {
  command = plan
  assert {
    condition     = aws_autoscaling_group.backend.min_size == 1 && aws_autoscaling_group.backend.max_size == 3
    error_message = "Backend capacity must remain bounded to 1-3."

  }
  assert {
    condition     = aws_autoscaling_policy.cpu.target_tracking_configuration[0].target_value == 50
    error_message = "The course baseline is a 50 percent CPU target."

  }
  assert {
    condition     = aws_launch_template.backend.metadata_options[0].http_tokens == "required"
    error_message = "IMDSv2 must be required."

  }
  assert {
    condition     = !strcontains(base64decode(aws_launch_template.backend.user_data), "DATABASE_URL=")
    error_message = "User-data must reference SSM, not embed database secrets."

  }
  assert {
    condition     = length(base64decode(aws_launch_template.backend.user_data)) <= 16384
    error_message = "EC2 user-data must fit the 16 KiB limit."
  }

}
run "restricted_lab_profile" {
  command = plan
  variables {
    create_iam                = false
    existing_instance_profile = "LabInstanceProfile"
  }
  assert {
    condition     = length(aws_iam_role.app) == 0 && aws_launch_template.backend.iam_instance_profile[0].name == "LabInstanceProfile"
    error_message = "Lab mode must reuse the approved profile without creating IAM roles."

  }
}
