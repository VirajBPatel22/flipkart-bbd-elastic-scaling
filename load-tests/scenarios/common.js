import http from 'k6/http';
import { check } from 'k6';
export const rate = Number(__ENV.RATE || 2);
export const duration = __ENV.DURATION || '10s';
export function optionsFor(scenario) {
  if ((scenario==='compute' || __ENV.TARGET==='compute') && !__ENV.LOAD_TEST_TOKEN) throw new Error('Configure LOAD_TEST_TOKEN in backend/.env before testing');
  const base = {startTime:'0s', preAllocatedVUs:2, maxVUs:8, timeUnit:'1s', gracefulStop:'5s'};
  let executor={...base, executor:'constant-arrival-rate', rate, duration};
  if (scenario==='ramp-up'||scenario==='recovery') executor={...base,executor:'ramping-arrival-rate',startRate:1,stages:[{duration,target:rate},{duration,target:scenario==='recovery'?1:rate}]};
  return {scenarios:{measured:executor},summaryTrendStats:['avg','med','p(95)'],thresholds:{http_req_failed:['rate<0.05'],checks:['rate>0.95']}};
}
export function request(compute=false) {
  const base=__ENV.BASE_URL||'http://localhost:8081';
  const useCompute=compute || __ENV.TARGET==='compute';
  if (useCompute && !__ENV.LOAD_TEST_TOKEN) throw new Error('LOAD_TEST_TOKEN is required');
  const r=useCompute?http.post(`${base}/api/demo/compute`,JSON.stringify({iterations:Number(__ENV.ITERATIONS||50000)}),{headers:{'Content-Type':'application/json','x-load-test-token':__ENV.LOAD_TEST_TOKEN},timeout:'10s'}):http.get(`${base}/api/instance`,{timeout:'10s'});
  check(r,{'HTTP 200':r=>r.status===200});
}
export function save(data) {return { [__ENV.RESULT_FILE||'/scripts/results/smoke.k6.json']:JSON.stringify(data,null,2) };}
