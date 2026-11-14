import json, sys, pathlib, statistics, csv
raw, samples, out, scenario, replicas, rate, exit_code, iterations, configured_duration = sys.argv[1:]
d=json.loads(pathlib.Path(raw).read_text()); m=d['metrics']
v=lambda name,key: m.get(name,{}).get('values',{}).get(key)
# k6 handleSummary metric values are nested under values.
rows=[]
for line in pathlib.Path(samples).read_text().splitlines():
    try: rows.append(json.loads(line))
    except ValueError: pass
valid=lambda k:[r[k] for r in rows if isinstance(r.get(k),(int,float))]
result={'id':pathlib.Path(out).name.removesuffix('.summary.json'),'timestamp':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'scenario':scenario,'replicas':int(replicas),'rate':int(rate),'durationSeconds':d.get('state',{}).get('testRunDurationMs',0)/1000,'totalRequests':v('http_reqs','count'),'successfulRequests':v('http_req_failed','fails'),'failedRequests':v('http_req_failed','passes'),'throughput':v('http_reqs','rate'),'averageMs':v('http_req_duration','avg'),'p50Ms':v('http_req_duration','med'),'p95Ms':v('http_req_duration','p(95)'),'failureRate':v('http_req_failed','rate'),'droppedIterations':v('dropped_iterations','count') or 0,'cpu':statistics.mean(valid('cpu')) if valid('cpu') else None,'memoryBytes':statistics.mean(valid('memoryBytes')) if valid('memoryBytes') else None,'metricSamples':len(rows),'limitations':'Short local run; shared host CPU and load generator; CPU is mean per running backend, one core=100%; no scaling benefit inferred.'}
result['iterations'] = int(iterations)
result['configuredDuration'] = configured_duration
result['valid'] = bool(result['totalRequests'])
result['k6ExitCode'] = int(exit_code)
result['thresholdsPassed'] = int(exit_code) == 0
pathlib.Path(out).write_text(json.dumps(result,indent=2)+'\n')
with pathlib.Path(out.replace('.summary.json','.csv')).open('w',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=result);writer.writeheader();writer.writerow(result)
print(json.dumps(result))

if not result['valid']: sys.exit('No HTTP measurements were recorded')
