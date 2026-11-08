import { useEffect, useState } from 'react';
import { getMonitoring, csvUrl } from '../services/monitoringApiClient';
const fmt=(v,unit='')=>v===null || v===undefined ? 'Unavailable' : `${Number(v).toFixed(2)}${unit}`;
function Chart({title,rows,xKey,yKeys}) {
  const points=rows.filter(r=>Number.isFinite(r[xKey]) && yKeys.some(k=>Number.isFinite(r[k])));
  if (!points.length) return <section className="card"><h3>{title}</h3><p>No measured data yet.</p></section>;
  const xs=points.map(r=>r[xKey]), ys=points.flatMap(r=>yKeys.map(k=>r[k])).filter(Number.isFinite);
  const min=Math.min(...xs), max=Math.max(...xs), ymax=Math.max(1,...ys);
  return <section className="card"><h3>{title}</h3><svg viewBox="0 0 440 160" role="img" aria-label={title}>
    <text x="2" y="14" fill="#94a3b8" fontSize="10">{ymax.toFixed(2)}</text><path d="M35 20V130H425" fill="none" stroke="#475569"/>
    {yKeys.map((k,i)=><g key={k}><polyline fill="none" stroke={['#38bdf8','#fbbf24'][i]} strokeWidth="2" points={points.filter(r=>Number.isFinite(r[k])).map(r=>`${35+(r[xKey]-min)/(max-min||1)*380},${130-r[k]/ymax*105}`).join(' ')}/>
    {points.filter(r=>Number.isFinite(r[k])).map((r,j)=><circle key={j} cx={35+(r[xKey]-min)/(max-min||1)*380} cy={130-r[k]/ymax*105} r="3" fill={['#38bdf8','#fbbf24'][i]}><title>{`${xKey}: ${r[xKey]}, ${k}: ${r[k]}`}</title></circle>)}</g>)}
    <text x="35" y="150" fill="#94a3b8" fontSize="10">{min.toFixed(1)}</text><text x="360" y="150" fill="#94a3b8" fontSize="10">{max.toFixed(1)}</text>
  </svg><p>{xKey} → {yKeys.join(' / ')}</p></section>;
}
export default function DashboardPage() {
  const [data,setData]=useState(null),[error,setError]=useState(''),[group,setGroup]=useState('');
  useEffect(()=>{let active=true; async function update(){try{const d=await getMonitoring();if(active){setData(d);setError('');}}catch(e){if(active)setError(e.message);}}update();const t=setInterval(update,4000);return()=>{active=false;clearInterval(t);};},[]);
  const o=data?.overview||{}, history=(data?.history||[]).map(r=>({...r,elapsedSeconds:(Date.parse(r.timestamp)-Date.parse(data.history[0].timestamp))/1000})), runs=data?.experiments||[];
  const key=r=>`${r.scenario} · ${r.rate} req/s · ${r.iterations??'unknown'} iterations`;
  const groups=[...new Set(runs.map(key))], selected=group||groups[0];
  const comparison=runs.filter(r=>key(r)===selected);
  return <main className="app-shell"><header><div><p>IT457 · ELASTIC SCALING OBSERVATORY</p><h1>Big Billion Days</h1></div><a href="/">Storefront ↗</a></header>
    <p>{o.environment||'Connecting'} · {o.environment==='AWS'?'EC2 Auto Scaling':'Manual local horizontal scaling'} · Updated {o.timestamp||'—'}</p>
    {(error||o.unavailable)&&<p role="alert" className="warning">{error||o.unavailable}</p>}
    <div className="metrics">{[['In-service replicas',o.replicaCount],['Desired capacity',o.desiredCapacity??o.replicaCount],['Healthy replicas',o.healthyCount],[o.environment==='AWS'?'EC2 average CPU %':'Mean CPU % (one core = 100%)',o.cpu],['Total memory MiB',o.memoryBytes == null ? null : o.memoryBytes/1048576],['Mean memory / limit %',o.memoryPercent],['Requests / second',o.requestRate],['Average latency ms',o.averageMs],['p95 latency ms',o.p95Ms],['HTTP error %',o.errorRate == null ? null : o.errorRate*100]].map(([label,v])=><section className="card" key={label}><p>{label}</p><strong>{fmt(v)}</strong></section>)}</div>
    {o.environment==='AWS'&&<p>CloudWatch data minute: {o.metricTimestamp||'Unavailable'} · Queries exclude the latest minute to allow publication. Missing metrics remain unavailable.</p>}
    <h2>Backend instances & request distribution</h2><p>{o.environment==='AWS'?o.distributionUnavailable:'Request counters are actual completed application requests since each replica started. Health and metrics probes are excluded.'}</p>
    <div className="table-wrap"><table><thead><tr>{['Container','State','Health','CPU %','Memory MiB','Uptime s','Requests'].map(v=><th key={v}>{v}</th>)}</tr></thead><tbody>{o.instances?.map(i=><tr key={i.id}><td>{i.id}</td><td>{i.state}</td><td>{i.health}</td><td>{fmt(i.cpu)}</td><td>{fmt(i.memoryBytes==null?null:i.memoryBytes/1048576)}</td><td>{fmt(i.uptimeSeconds)}</td><td>{i.requests??'Unavailable'}</td></tr>)}</tbody></table></div>
    <h2>Live metrics</h2><p>{o.environment==='AWS'?'CloudWatch 60-second backend target-group metrics. CPU/memory and request metrics may have different publication times. Errors count target HTTP 4xx/5xx; gateway failures are separate.':'Rolling 60 seconds, capped at 10,000 samples per replica; latency and errors unavailable when idle.'} Chart x-axis is elapsed time in seconds. History resets on monitoring restart.</p>
    <div className="charts">{[['CPU %',['cpu']],['Memory bytes',['memoryBytes']],['Requests / second',['requestRate']],['Latency ms',['averageMs','p95Ms']],['HTTP error fraction',['errorRate']],['Replica count',['replicaCount']]].map(([title,keys])=><Chart key={title} title={title} rows={history} xKey="elapsedSeconds" yKeys={keys}/>)}</div>
    <h2>Load testing & experiment comparison</h2><a href={csvUrl}>Export CSV</a><p>Only saved measurements appear here. Short smoke runs establish functionality, not scaling benefits. Compare matching workload groups; inspect dropped iterations and threshold status.</p>
    {!runs.length?<p>No completed experiments. Run load-tests/run-local-experiments.sh in WSL.</p>:<div className="table-wrap"><table><thead><tr>{['Scenario','Offered req/s','Iterations','Thresholds','Replicas','Duration s','Requests','Req/s','Avg ms','p95 ms','Failure %','CPU %','Dropped','Timestamp'].map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{runs.map(r=><tr key={r.id}><td>{r.scenario}</td><td>{r.rate}</td><td>{r.iterations??'Unknown'}</td><td>{r.thresholdsPassed===false?'FAILED':r.thresholdsPassed===true?'Passed':'Unknown'}</td><td>{r.replicas}</td><td>{fmt(r.durationSeconds)}</td><td>{r.totalRequests}</td><td>{fmt(r.throughput)}</td><td>{fmt(r.averageMs)}</td><td>{fmt(r.p95Ms)}</td><td>{fmt(r.failureRate*100)}</td><td>{fmt(r.cpu)}</td><td>{r.droppedIterations}</td><td>{r.timestamp}</td></tr>)}</tbody></table></div>}
    {!!groups.length&&<label>Comparison workload <select value={selected} onChange={e=>setGroup(e.target.value)}>{groups.map(g=><option key={g}>{g}</option>)}</select></label>}
    <div className="charts">{[['Replicas vs average latency ms','replicas','averageMs'],['Replicas vs p95 latency ms','replicas','p95Ms'],['Replicas vs throughput req/s','replicas','throughput'],['Replicas vs mean CPU %','replicas','cpu'],['Offered requests/s vs latency ms','rate','averageMs']].map(([title,x,y])=><Chart key={title} title={title} rows={[...comparison].sort((a,b)=>a[x]-b[x])} xKey={x} yKeys={[y]}/>)}</div>
    <h2>Scaling events</h2>{data?.events?.length?data.events.map((e,i)=><p key={i}>{e.timestamp} · {e.status||'Observed'} · {e.message}</p>):<p>No scaling activities available in this monitoring session.</p>}
    <h2>Environment status</h2><p>{o.source||'Metrics unavailable'} · {o.environment==='AWS'?'AWS API data; verify metric timestamps and target health.':'Local Docker measurements. AWS is a separate deployment.'}</p>
  </main>;
}
