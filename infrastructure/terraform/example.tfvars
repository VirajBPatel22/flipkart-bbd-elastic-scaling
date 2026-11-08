# Non-secret configuration only. Copy to terraform.tfvars and replace placeholders.
region          = "ap-south-1"
project         = "bbd-it457"
instance_type   = "t3.micro"
public_hostname = "bbd.example.com"
certificate_arn = "arn:aws:acm:ap-south-1:123456789012:certificate/REPLACE"
allowed_cidrs   = ["203.0.113.10/32"]
images = {
  frontend   = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bbd/frontend@sha256:REPLACE_WITH_64_HEX_DIGEST"
  backend    = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bbd/backend@sha256:REPLACE_WITH_64_HEX_DIGEST"
  dashboard  = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bbd/dashboard@sha256:REPLACE_WITH_64_HEX_DIGEST"
  monitoring = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bbd/monitoring@sha256:REPLACE_WITH_64_HEX_DIGEST"
}
backend_parameter_name   = "/it457/bbd/backend"
dashboard_parameter_name = "/it457/bbd/dashboard"
enable_compute           = false
# Restricted AWS Academy accounts: use an instructor-approved existing profile.
# create_iam = false
# existing_instance_profile = "LabInstanceProfile"
