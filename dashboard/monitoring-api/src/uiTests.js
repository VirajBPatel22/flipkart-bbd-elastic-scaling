const fs=require('node:fs/promises');
const path=require('node:path');
function sanitizeTestName(name){
 if(typeof name!=='string')return '';
 return name.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,80);
}
async function saveRun(active,snapshot){
 if(active.saved)return;
 const values=(active.type==='cpu'?active.probeSamples:active.samples).map(r=>r.latency).filter(Number.isFinite).sort((a,b)=>a-b);
 const seconds=Math.max(0.001,(Date.parse(active.finishedAt)-Date.parse(active.startedAt))/1000);
 const cpu=(active.type==='cpu'?active.samples:[]).map(r=>r.cpu).filter(Number.isFinite);
 const percentile=p=>values.length?values[Math.max(0,Math.ceil(values.length*p)-1)]:null;
 const row={id:'ui-'+active.id,testName:active.name||null,environment:process.env.ENVIRONMENT||'LOCAL_DOCKER',timestamp:active.finishedAt,scenario:active.type==='cpu'?'cpu-scaling-observation':'api-probe',experimentMode:'observe',status:active.status,phase:active.phase||null,scaledOut:active.scaledOut||false,twoHealthy:active.twoHealthy||false,replicas:null,rate:active.rate,iterations:null,durationSeconds:seconds,totalRequests:active.completed,successfulRequests:active.success,failedRequests:active.failed,throughput:active.completed/seconds,averageMs:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,p50Ms:percentile(.5),p95Ms:percentile(.95),failureRate:active.completed?active.failed/active.completed:null,droppedIterations:null,cpu:cpu.length?cpu.reduce((a,b)=>a+b,0)/cpu.length:null,thresholdsPassed:active.status==='completed'?(active.type==='cpu'?Boolean(active.twoHealthy):active.failed===0):false,valid:true,source:active.type==='cpu'?'Dashboard CPU scaling observation':'Dashboard read-only API probe'};
 try{const dir=process.env.UI_RESULTS_DIR||'/tmp/it457-ui-results';await fs.mkdir(dir,{recursive:true});const file=path.join(dir,row.id+'.summary.json');await fs.writeFile(file+'.tmp',JSON.stringify(row));await fs.rename(file+'.tmp',file);active.saved=true;delete active.saveError;}catch{active.saveError='Result could not be saved';}
}
const { performance } = require('node:perf_hooks');
let job = null;
async function target() {
  if (process.env.ENVIRONMENT !== 'AWS') return (process.env.BACKEND_TEST_URL || 'http://backend:5000') + '/api/instance';
  const { EC2Client, DescribeNetworkInterfacesCommand } = require('@aws-sdk/client-ec2');
  const name = process.env.LOAD_BALANCER_ARN?.split('loadbalancer/')[1];
  if (!name) throw new Error('Load balancer is not configured');
  const r = await new EC2Client({region:process.env.AWS_REGION}).send(new DescribeNetworkInterfacesCommand({Filters:[{Name:'description',Values:['ELB '+name]}]}));
  const ip = r.NetworkInterfaces?.[0]?.PrivateIpAddress;
  if (!ip || !/^10\.47\.\d+\.\d+$/.test(ip)) throw new Error('No project ALB private address available');
  return `http://${ip}:8080/api/instance`;
}
function install(app, snapshot = ()=>({}), resolveTarget = target) {
  const enabled = process.env.ENVIRONMENT !== 'AWS' || process.env.DASHBOARD_TESTS_ENABLED === 'true';
  app.post('/api/test/capacity',async(req,res)=>{
    if(!enabled||process.env.ENVIRONMENT!=='AWS')return res.status(403).json({error:'AWS scaling controls are unavailable'});
    if(req.headers['x-it457-test']!=='1'||(req.headers.origin&&req.headers.origin!==`${req.protocol}://${req.get('host')}`))return res.status(403).json({error:'Scaling request rejected'});
    const desired=req.body?.desiredCapacity;
    if(![1,2].includes(desired))return res.status(400).json({error:'Choose one or two backends'});
    if(job?.status==='running'&&job.type==='cpu')return res.status(409).json({error:'Stop the CPU observation before manual scaling'});
    const state=snapshot();
    if(state.minimumCapacity>desired||state.maximumCapacity<desired||!process.env.ASG_NAME)return res.status(409).json({error:'Requested capacity is outside the configured project limits'});
    try{
      const {AutoScalingClient,SetDesiredCapacityCommand}=require('@aws-sdk/client-auto-scaling');
      await new AutoScalingClient({region:process.env.AWS_REGION}).send(new SetDesiredCapacityCommand({AutoScalingGroupName:process.env.ASG_NAME,DesiredCapacity:desired,HonorCooldown:false}));
      res.json({desiredCapacity:desired,message:`Requested ${desired} backend(s). Automatic scaling remains enabled and may change capacity again.`});
    }catch(error){const busy=['ScalingActivityInProgressFault','ResourceContentionFault'].includes(error.name);res.status(busy?409:503).json({error:busy?'AWS is completing a scaling activity. Wait for the instance transition to finish, refresh metrics, then retry.':`AWS scaling request failed (${error.name || 'UnknownError'}). Check dashboard permissions and scaling activity.`});}
  });
  app.get('/api/test', (req,res)=>res.json({enabled,cpuEnabled:enabled&&process.env.ENVIRONMENT==='AWS',job}));
  app.post('/api/test', async(req,res)=>{
    if (!enabled) return res.status(403).json({error:'Dashboard tests are not enabled'});
    if (req.headers['x-it457-test'] !== '1') return res.status(403).json({error:'Missing test request header'});
    if (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}` && !(process.env.ENVIRONMENT!=='AWS' && req.headers.origin===process.env.CORS_ORIGIN)) return res.status(403).json({error:'Cross-origin test rejected'});
    if (job?.status === 'running') return res.status(409).json({error:'A test is already running'});
    if(req.body?.type==='cpu') {
      const o=snapshot();
      if(process.env.ENVIRONMENT!=='AWS'||req.body.confirmScaling!==true) return res.status(400).json({error:'Confirm the AWS CPU scaling test'});
      if(o.desiredCapacity!==1||o.replicaCount!==1||o.healthyCount!==1||o.maximumCapacity!==2) return res.status(409).json({error:'CPU test requires one healthy backend and a quota-safe maximum of two'});
      if((o.suspendedProcesses||[]).length) return res.status(409).json({error:`Auto Scaling is paused (${o.suspendedProcesses.join(', ')}). Resume the Auto Scaling group before starting this test.`});
      const rate=Number(req.body?.rate);
      const duration=Number(req.body?.duration??360);
      if(!Number.isInteger(duration)||duration<60||duration>900)return res.status(400).json({error:'CPU duration must be 60-900 seconds'});
      if(!Number.isInteger(rate)||rate<1||rate>50) return res.status(400).json({error:'CPU observation probe rate must be 1-50 requests/second'});
      const backend=o.instances?.find(instance=>instance.lifecycle==='InService'&&instance.health==='healthy');
      if(!backend) return res.status(409).json({error:'CPU test requires a healthy in-service backend target'});
      const active={id:Date.now().toString(),type:'cpu',name:sanitizeTestName(req.body?.name),status:'running',phase:'Starting bounded CPU load and ALB probes',startedAt:new Date().toISOString(),duration,observationTimeout:duration+120,rate,completed:0,success:0,failed:0,samples:[],probeSamples:[],instance:backend.id};job=active;
      try {
        const url=await resolveTarget();
        const {SSMClient,SendCommandCommand,GetCommandInvocationCommand}=require('@aws-sdk/client-ssm');
        active.unit='it457-dashboard-cpu';
        const client=new SSMClient({region:process.env.AWS_REGION});
        const result=await client.send(new SendCommandCommand({InstanceIds:[active.instance],DocumentName:process.env.CPU_TEST_DOCUMENT,Parameters:{action:['start'],durationSeconds:[String(duration)]}}));
        active.commandId=result.Command.CommandId;active.phase='CPU load and ALB probes are running for the configured duration';
        active.probeTask=(async()=>{
          const deadline=Date.now()+active.duration*1000;
          while(Date.now()<deadline&&active.status==='running') {
            const tick=Date.now();
            await Promise.all(Array.from({length:active.rate},async()=>{
              const started=performance.now();let ok=false;
              try {const response=await fetch(url,{signal:AbortSignal.timeout(3000),redirect:'error'});await response.arrayBuffer();ok=response.status===200;}catch{}
              const latency=performance.now()-started;active.completed++;active[ok?'success':'failed']++;
              active.probeSamples.push({timestamp:new Date().toISOString(),latency,ok});
            }));
            await new Promise(resolve=>setTimeout(resolve,Math.max(0,1000-(Date.now()-tick))));
          }
        })();
        let polling=false;const timer=setInterval(async()=>{
          if(active.status!=='running'){clearInterval(timer);return;}if(polling)return;polling=true;
          try {const command=await client.send(new GetCommandInvocationCommand({CommandId:active.commandId,InstanceId:active.instance}));if(['Failed','Cancelled','TimedOut'].includes(command.Status)){active.status='failed';active.phase='CPU command did not start successfully; inspect AWS SSM';clearInterval(timer);active.finishedAt=new Date().toISOString();await active.probeTask;await saveRun(active,snapshot);return;}}catch(e){if(e.name!=='InvocationDoesNotExist'){active.status='failed';active.phase='Unable to verify CPU command status';clearInterval(timer);active.finishedAt=new Date().toISOString();await active.probeTask;await saveRun(active,snapshot);return;}}finally{polling=false;}
          const v=snapshot();active.samples.push({timestamp:new Date().toISOString(),cpu:v.cpu,replicaCount:v.replicaCount,desiredCapacity:v.desiredCapacity,healthyCount:v.healthyCount});
          const recent=(v.events||[]).filter(e=>e.timestamp>=active.startedAt&&e.status==='Successful');
          const highAlarmActivity=recent.some(e=>e.cause?.includes('AlarmHigh')&&e.cause.includes('triggered policy'));
          if(highAlarmActivity||v.desiredCapacity>1||v.replicaCount>1)active.scaledOut=true;
          if(active.scaledOut&&v.desiredCapacity>=2&&v.replicaCount>=2&&v.healthyCount>=2)active.twoHealthy=true;
          const elapsed=Date.now()-Date.parse(active.startedAt);
          if(elapsed>=active.duration*1000&&active.twoHealthy){
            active.status='completed';
            active.phase='CPU run complete: CPU-triggered scale-out reached two healthy backends; scale-in follows the low-CPU policy after its evaluation window';
          } else if(elapsed>=active.observationTimeout*1000){
            active.status='incomplete';
            active.phase=v.desiredCapacity>1?'Scale-out started but two healthy backends were not confirmed within the observation window; check target health':'CPU run ended without confirmed scale-out; check the CPU alarm and Auto Scaling activity';
          } else if(elapsed>=active.duration*1000){
            active.phase='CPU load ended; allowing up to two minutes for both ALB targets to become healthy';
          } else active.phase=active.twoHealthy?'Two healthy backends; completing the configured observation':v.desiredCapacity>1?'Policy scaled out; waiting for healthy capacity':'Waiting for high CPU alarm';
          if(active.status!=='running'){clearInterval(timer);active.finishedAt=new Date().toISOString();await active.probeTask;await saveRun(active,snapshot);}
        },10000);timer.unref();
        return res.status(202).json(active);
      }catch{active.status='failed';active.phase='Could not submit CPU load; verify SSM permissions';return res.status(503).json({error:active.phase});}
    }
    const rate=Number(req.body?.rate),duration=Number(req.body?.duration);
    if (!Number.isInteger(rate)||rate<1||rate>50||!Number.isInteger(duration)||duration<10||duration>60) return res.status(400).json({error:'Rate must be 1-50 req/s; duration 10-60 seconds'});
    try {
      job={status:'running',phase:'Resolving test target'};const url=await resolveTarget();
      job={id:Date.now().toString(),name:sanitizeTestName(req.body?.name),status:'running',startedAt:new Date().toISOString(),rate,duration,completed:0,success:0,failed:0,samples:[]};
      const active=job; res.status(202).json(active);
      (async()=>{
        try {
          const deadline=performance.now()+duration*1000;
          for(let second=0;performance.now()<deadline && active.status==='running';second++) {
            const tick=performance.now();
            await Promise.all(Array.from({length:rate},async()=>{
              const start=performance.now(); let ok=false;
              try {const r=await fetch(url,{signal:AbortSignal.timeout(3000),redirect:'error'});await r.arrayBuffer();ok=r.status===200;} catch {}
              const ms=performance.now()-start;active.completed++;active[ok?'success':'failed']++;active.samples.push({timestamp:new Date().toISOString(),latency:ms,ok});
            }));
            await new Promise(r=>setTimeout(r,Math.max(0,1000-(performance.now()-tick))));
          }
          if(active.status==='running')active.status='completed';
        }catch{active.status='failed';}finally{active.finishedAt=new Date().toISOString();await saveRun(active,snapshot);}
      })();
    }catch{job={status:'failed'};res.status(503).json({error:'Test target discovery failed'});}
  });
  app.post('/api/test/stop',async(req,res)=>{
    if(req.headers['x-it457-test']!=='1')return res.sendStatus(403);
    if(job?.status==='running') {
      if(job.type==='cpu') {
        try {const {SSMClient,SendCommandCommand}=require('@aws-sdk/client-ssm');await new SSMClient({region:process.env.AWS_REGION}).send(new SendCommandCommand({InstanceIds:[job.instance],DocumentName:process.env.CPU_TEST_DOCUMENT,Parameters:{action:['stop']}}));job.phase='CPU stop submitted; monitor automatic recovery in the live charts';job.status='stopped';job.finishedAt=new Date().toISOString();await job.probeTask;await saveRun(job,snapshot);}
        catch {return res.status(503).json({error:'Stop command failed; CPU load still has its independent configured time bound'});}
      } else job.status='stopped';
    }res.json({job});
  });
}
module.exports={install,saveRun};
