#!/bin/bash
set -eu
case "{{ action }}" in
 start)
 cat > /tmp/it457-dashboard-cpu.py <<'PY'
import hashlib,multiprocessing,time

def burn():
    end=time.monotonic()+360
    while time.monotonic()<end:
        hashlib.sha256(b'it457-dashboard-cpu').digest()

if __name__=='__main__':
    workers=[multiprocessing.Process(target=burn) for _ in range(2)]
    for worker in workers:worker.start()
    for worker in workers:worker.join()
PY
 systemd-run --unit=it457-dashboard-cpu --property=RuntimeMaxSec=390 /usr/bin/python3 /tmp/it457-dashboard-cpu.py
 ;;
 stop) systemctl stop it457-dashboard-cpu || true ;;
 *) exit 2 ;;
esac
