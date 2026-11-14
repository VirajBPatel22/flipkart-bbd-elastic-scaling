# Copy to terraform.tfvars and replace the example CIDR with YOUR public IPv4 /32.
# Supply images separately with the existing release JSON file.
region           = "ap-south-1"
project          = "bbd-it457"
demo_http        = true
allowed_cidrs    = ["203.0.113.10/32"]
enable_compute   = false
backend_max_size = 2 # Fits four t3.micro instances within an 8-vCPU quota.
