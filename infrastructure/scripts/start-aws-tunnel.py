"""Start an interactive SSM port-forward session. Run manually in WSL."""
import argparse
import ipaddress
import json
import subprocess


def aws(region, *options):
    result = subprocess.run(['aws', *options, '--region', region, '--output', 'json'],
                            capture_output=True, check=True)
    return json.loads(result.stdout)


def alb_private_ip(region, target, arn):
    lb = aws(region, 'elbv2', 'describe-load-balancers', '--load-balancer-arns', arn)['LoadBalancers'][0]
    instance = aws(region, 'ec2', 'describe-instances', '--instance-ids', target)['Reservations'][0]['Instances'][0]
    if instance['VpcId'] != lb['VpcId']:
        raise ValueError('Tunnel instance and ALB must be in the same VPC')
    # Use the ALB's private ENI address so its source-security-group rule applies.
    interfaces = aws(region, 'ec2', 'describe-network-interfaces', '--filters',
                     'Name=group-id,Values=' + ','.join(lb['SecurityGroups']),
                     'Name=vpc-id,Values=' + lb['VpcId'])['NetworkInterfaces']
    description = 'ELB ' + arn.split('loadbalancer/')[1]
    candidates = [eni for eni in interfaces if eni.get('Description') == description]
    candidates.sort(key=lambda eni: eni['SubnetId'] != instance['SubnetId'])
    if not candidates:
        raise ValueError('No matching ALB network interface found; retry after ALB is active')
    address = candidates[0]['PrivateIpAddress']
    if not ipaddress.ip_address(address).is_private:
        raise ValueError('Expected a private ALB address')
    return address


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('component', choices=['dashboard', 'compute'])
    parser.add_argument('--region', default='ap-south-1')
    parser.add_argument('--target', required=True, help='Dashboard instance for dashboard; frontend instance for compute')
    parser.add_argument('--load-balancer', help='ALB ARN, required for compute')
    args = parser.parse_args()
    if args.component == 'dashboard':
        document = 'AWS-StartPortForwardingSession'
        parameters = {'portNumber': ['80'], 'localPortNumber': ['18080']}
        print('Open http://127.0.0.1:18080/dashboard/ after the session starts.', flush=True)
    else:
        if not args.load_balancer:
            parser.error('Compute requires --load-balancer')
        document = 'AWS-StartPortForwardingSessionToRemoteHost'
        parameters = {'host': [alb_private_ip(args.region, args.target, args.load_balancer)],
                      'portNumber': ['8080'], 'localPortNumber': ['18082']}
        print('Compute base URL: http://127.0.0.1:18082; keep this terminal open.', flush=True)
    subprocess.run(['aws', 'ssm', 'start-session', '--region', args.region,
                    '--target', args.target, '--document-name', document,
                    '--parameters', json.dumps(parameters)], check=True)


if __name__ == '__main__':
    main()
