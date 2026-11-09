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
function install(app, snapshot = ()=>({})) {
  const enabled = process.env.ENVIRONMENT !== 'AWS' || process.env.DASHBOARD_TESTS_ENABLED === 'true';
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
      const active={id:Date.now().toString(),type:'cpu',status:'running',phase:'Starting bounded CPU load',startedAt:new Date().toISOString(),samples:[],instance:o.instances[0].id};job=active;
      try {
        const {SSMClient,SendCommandCommand,GetCommandInvocationCommand}=require('@aws-sdk/client-ssm');
        active.unit='it457-dashboard-cpu';
        const client=new SSMClient({region:process.env.AWS_REGION});
        const result=await client.send(new SendCommandCommand({InstanceIds:[active.instance],DocumentName:process.env.CPU_TEST_DOCUMENT,Parameters:{action:['start']}}));
        active.commandId=result.Command.CommandId;active.phase='CPU load submitted; observing policy';
        let polling=false;const timer=setInterval(async()=>{
          if(active.status!=='running'){clearInterval(timer);return;}if(polling)return;polling=true;
          try {const command=await client.send(new GetCommandInvocationCommand({CommandId:active.commandId,InstanceId:active.instance}));if(['Failed','Cancelled','TimedOut'].includes(command.Status)){active.status='failed';active.phase='CPU command did not start successfully; inspect AWS SSM';clearInterval(timer);return;}}catch(e){if(e.name!=='InvocationDoesNotExist'){active.status='failed';active.phase='Unable to verify CPU command status';clearInterval(timer);return;}}finally{polling=false;}
          const v=snapshot();active.samples.push({timestamp:new Date().toISOString(),cpu:v.cpu,replicaCount:v.replicaCount,desiredCapacity:v.desiredCapacity,healthyCount:v.healthyCount});
          const recent=(v.events||[]).filter(e=>e.timestamp>=active.startedAt&&e.status==='Successful');
          if(recent.some(e=>e.cause?.includes('AlarmHigh')&&e.cause.includes('triggered policy')))active.scaledOut=true;
          if(active.scaledOut&&v.healthyCount>=2)active.twoHealthy=true;
          if(active.twoHealthy&&v.replicaCount===1&&v.healthyCount===1&&recent.some(e=>e.cause?.includes('AlarmLow')&&e.cause.includes('triggered policy'))){active.status='completed';active.phase='Automatic 1 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ 2 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ 1 cycle verified';}
          else active.phase=active.twoHealthy?'Two healthy backends; waiting for automatic scale-in':v.desiredCapacity>1?'Policy scaled out; waiting for healthy capacity':'Waiting for high CPU alarm';
          if(Date.now()-Date.parse(active.startedAt)>1800000){active.status='incomplete';active.phase='Observation timed out; inspect AWS capacity';}
          if(active.status!=='running'){clearInterval(timer);active.finishedAt=new Date().toISOString();}
        },10000);timer.unref();
        return res.status(202).json(active);
      }catch{active.status='failed';active.phase='Could not submit CPU load; verify SSM permissions';return res.status(503).json({error:active.phase});}
    }
    const rate=Number(req.body?.rate),duration=Number(req.body?.duration);
    if (!Number.isInteger(rate)||rate<1||rate>5||!Number.isInteger(duration)||duration<10||duration>60) return res.status(400).json({error:'Rate must be 1ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ5 req/s; duration 10ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ60 seconds'});
    try {
      job={status:'running',phase:'Resolving test target'};const url=await target();
      job={id:Date.now().toString(),status:'running',startedAt:new Date().toISOString(),rate,duration,completed:0,success:0,failed:0,samples:[]};
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
        }catch{active.status='failed';}finally{active.finishedAt=new Date().toISOString();}
      })();
    }catch{job={status:'failed'};res.status(503).json({error:'Test target discovery failed'});}
  });
  app.post('/api/test/stop',async(req,res)=>{
    if(req.headers['x-it457-test']!=='1')return res.sendStatus(403);
    if(job?.status==='running') {
      if(job.type==='cpu') {
        try {const {SSMClient,SendCommandCommand}=require('@aws-sdk/client-ssm');await new SSMClient({region:process.env.AWS_REGION}).send(new SendCommandCommand({InstanceIds:[job.instance],DocumentName:process.env.CPU_TEST_DOCUMENT,Parameters:{action:['stop']}}));job.phase='CPU stop submitted; monitor automatic recovery in the live charts';job.status='stopped';}
        catch {return res.status(503).json({error:'Stop command failed; CPU load still has its independent six-minute bound'});}
      } else job.status='stopped';
    }res.json({job});
  });
}
module.exports={install};
