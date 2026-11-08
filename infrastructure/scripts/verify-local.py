"""Read-only integration checks. Run with Python3 in WSL after Compose startup."""
import json
import os
import pathlib
import re
import urllib.request
import urllib.error

base = os.environ.get('BASE_URL', 'http://localhost:8081')
evidence = {'baseUrl': base, 'checks': []}

def get(route):
    with urllib.request.urlopen(base + route, timeout=20) as response:
        body = response.read().decode()
        evidence['checks'].append({'route': route, 'status': response.status})
        return body

for route in ['/', '/dashboard/', '/dashboard/refreshed-route']:
    html = get(route)
    assert '<div id="root">' in html
    for asset in re.findall(r'(?:src|href)="([^"]+\.(?:js|css))"', html):
        get(asset)

assert json.loads(get('/api/health'))['status'] == 'ok'
products = json.loads(get('/api/products'))['data']
assert len(products) > 0
evidence['productCount'] = len(products)
filtered = json.loads(get('/api/products?category=Fashion'))['data']
assert filtered and all(p['category'] == 'Fashion' for p in filtered)
assert len(json.loads(get('/api/products?limit=1'))['data']) == 1
evidence['identity'] = json.loads(get('/api/instance'))['instanceId']
assert json.loads(get('/monitoring-api/api/health'))['status'] == 'ok'
overview = json.loads(get('/monitoring-api/api/overview'))
assert not overview.get('unavailable'), overview
assert overview['replicaCount'] == overview['healthyCount']
assert overview['cpu'] is not None and overview['memoryBytes'] > 0
evidence['overview'] = overview
history = json.loads(get('/monitoring-api/api/history'))
assert history
evidence['historySamples'] = len(history)
runs = json.loads(get('/monitoring-api/api/experiments'))
evidence['savedExperimentCount'] = len(runs)
get('/monitoring-api/api/experiments.csv')
try:
    get('/internal/metrics')
    raise AssertionError('Internal metrics exposed by gateway')
except urllib.error.HTTPError as error:
    assert error.code == 404
    evidence['checks'].append({'route': '/internal/metrics', 'status': 404})
try:
    req = urllib.request.Request(base + '/api/demo/compute', data=b'{}', headers={'Content-Type':'application/json'})
    urllib.request.urlopen(req)
    raise AssertionError('Compute accepted missing authentication')
except urllib.error.HTTPError as error:
    assert error.code == 401
    evidence['checks'].append({'route': '/api/demo/compute (no token)', 'status': 401})

out = pathlib.Path(__file__).resolve().parents[2] / 'load-tests/results/http-verification.json'
out.write_text(json.dumps(evidence, indent=2) + '\n')
print(json.dumps(evidence, indent=2))
