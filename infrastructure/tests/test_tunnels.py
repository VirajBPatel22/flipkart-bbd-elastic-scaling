import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


tunnel = module('tunnel', 'infrastructure/scripts/start-aws-tunnel.py')
runner = module('tunnel_runner', 'load-tests/run-aws-experiments.py')


class TunnelTests(unittest.TestCase):
    def test_token_transport_requires_https_or_explicit_loopback(self):
        self.assertTrue(runner.valid_url('https://demo.example.com'))
        self.assertTrue(runner.valid_url('http://127.0.0.1:18082', True))
        for url in ['http://127.0.0.1:18082', 'http://public.example.com',
                    'http://localhost:18082', 'http://127.0.0.1',
                    'https://user:password@example.com', 'https://example.com?token=abc',
                    'https://example.com:bad']:
            with self.subTest(url=url):
                self.assertFalse(runner.valid_url(url, url != 'http://127.0.0.1:18082'))

    def test_selects_matching_private_alb_interface(self):
        arn = 'arn:aws:elasticloadbalancing:ap-south-1:123456789012:loadbalancer/app/demo/1234'
        responses = [
            {'LoadBalancers': [{'VpcId': 'vpc-a', 'SecurityGroups': ['sg-alb']}]},
            {'Reservations': [{'Instances': [{'VpcId': 'vpc-a', 'SubnetId': 'subnet-a'}]}]},
            {'NetworkInterfaces': [
                {'Description': 'ELB app/demo/1234', 'SubnetId': 'subnet-b', 'PrivateIpAddress': '10.47.2.10'},
                {'Description': 'ELB app/demo/1234', 'SubnetId': 'subnet-a', 'PrivateIpAddress': '10.47.1.10'},
                {'Description': 'unrelated', 'SubnetId': 'subnet-a', 'PrivateIpAddress': '10.47.1.11'}]}]
        with patch.object(tunnel, 'aws', side_effect=responses):
            self.assertEqual(tunnel.alb_private_ip('ap-south-1', 'i-test', arn), '10.47.1.10')

    def test_rejects_cross_vpc_forward(self):
        with patch.object(tunnel, 'aws', side_effect=[
            {'LoadBalancers': [{'VpcId': 'vpc-a'}]},
            {'Reservations': [{'Instances': [{'VpcId': 'vpc-b'}]}]}]):
            with self.assertRaises(ValueError):
                tunnel.alb_private_ip('ap-south-1', 'i-test', 'unused')
