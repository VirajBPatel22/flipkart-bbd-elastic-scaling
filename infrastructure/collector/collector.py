"""Local-only fixed-function collector. Never accepts Docker paths, IDs or mutations from clients."""
import http.client, socket, json, os, time, threading, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode

class DockerConnection(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(3)
        self.sock.connect('/var/run/docker.sock')

def docker(path):
    conn = DockerConnection('localhost', timeout=3)
    try:
        conn.request('GET', '/v1.41' + path)
        res = conn.getresponse()
        if res.status != 200: raise RuntimeError('Docker read failed')
        return json.loads(res.read())
    finally: conn.close()

cache = {'instances': [], 'unavailable': 'Waiting for first collection'}
previous = {}
def collect():
    global cache
    while True:
        try:
            filters = json.dumps({'label': ['com.docker.compose.project=' + os.environ['COMPOSE_PROJECT'], 'com.docker.compose.service=backend']})
            containers = docker('/containers/json?all=1&' + urlencode({'filters': filters}))
            instances = []
            for c in containers:
                item = {'id': c['Id'][:12], 'state': c['State'], 'health': 'unavailable', 'cpu': None, 'memoryBytes': None, 'memoryPercent': None, 'uptimeSeconds': None, 'requests': None, 'samples': []}
                try:
                    info = docker('/containers/' + c['Id'] + '/json')
                    item['health'] = info['State'].get('Health', {}).get('Status', 'unavailable')
                    if c['State'] == 'running':
                        stats = docker('/containers/' + c['Id'] + '/stats?stream=false&one-shot=true')
                        cpu = stats['cpu_stats']; total = cpu['cpu_usage']['total_usage']; system = cpu.get('system_cpu_usage', 0)
                        old = previous.get(c['Id']); previous[c['Id']] = (total, system)
                        if old and system > old[1]: item['cpu'] = max(0, (total-old[0])/(system-old[1])*cpu.get('online_cpus', 1)*100)
                        mem = stats['memory_stats']; item['memoryBytes'] = max(0, mem.get('usage', 0)-mem.get('stats', {}).get('inactive_file', 0))
                        item['memoryPercent'] = item['memoryBytes']/mem['limit']*100 if mem.get('limit') else None
                        networks = info['NetworkSettings']['Networks']
                        ip = next(n['IPAddress'] for n in networks.values() if n['IPAddress'])
                        with urllib.request.urlopen('http://' + ip + ':5000/internal/metrics', timeout=2) as r: item.update(json.load(r))
                except Exception:
                    item['unavailable'] = 'Some container or application measurements unavailable'
                instances.append(item)
            cache = {'instances': instances, 'timestamp': time.time(), 'source': 'Docker Engine stats + backend rolling HTTP samples'}
        except Exception:
            cache = {'instances': [], 'unavailable': 'Docker collection failed', 'timestamp': time.time()}
        time.sleep(3)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != '/snapshot': self.send_error(404); return
        body=json.dumps(cache).encode(); self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers(); self.wfile.write(body)
    def log_message(self, *args): pass

threading.Thread(target=collect, daemon=True).start()
ThreadingHTTPServer(('0.0.0.0',9100),Handler).serve_forever()
