const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const express=require('express');const {install}=require('../src/uiTests');
test('dashboard probes enforce bounds, origin, concurrency and cancellation',async()=>{
 const target=http.createServer((q,s)=>s.end('{}'));await new Promise(r=>target.listen(0,'127.0.0.1',r));process.env.ENVIRONMENT='LOCAL_DOCKER';process.env.BACKEND_TEST_URL=`http://127.0.0.1:${target.address().port}`;
 const app=express();app.use(express.json());install(app);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const post=(body,origin,path='/api/test')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','x-it457-test':'1',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
 try {
  assert.equal((await post({rate:6,duration:10})).status,400);assert.equal((await post({rate:1,duration:61})).status,400);assert.equal((await post({rate:1,duration:10},'https://untrusted.example')).status,403);assert.equal((await post({type:'cpu',confirmScaling:false})).status,400);
  assert.equal((await post({rate:1,duration:10})).status,202);assert.equal((await post({rate:1,duration:10})).status,409);
  let state;for(let i=0;i<30;i++){state=await(await fetch(base+'/api/test')).json();if(state.job.completed>0)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(state.job.success>0);assert.equal(state.job.failed,0);assert.ok(state.job.samples[0].timestamp);assert.ok(state.job.samples[0].latency>=0);
  assert.equal((await post({},null,'/api/test/stop')).status,200);assert.equal((await(await fetch(base+'/api/test')).json()).job.status,'stopped');
 }finally{server.closeAllConnections();target.closeAllConnections();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>target.close(r))]);}
});
const {SSMClient}=require('@aws-sdk/client-ssm');
test('AWS CPU controls use only the fixed document and scoped start/stop actions',async(t)=>{
 const commands=[];t.mock.method(SSMClient.prototype,'send',async command=>{commands.push(command.input);return {Command:{CommandId:'fixture-command'}};});
 process.env.ENVIRONMENT='AWS';process.env.DASHBOARD_TESTS_ENABLED='true';process.env.CPU_TEST_DOCUMENT='fixture-fixed-cpu';
 const snapshot={desiredCapacity:1,replicaCount:1,healthyCount:1,maximumCapacity:2,instances:[{id:'i-fixture',lifecycle:'InService',health:'healthy'}]};
 const app=express();app.use(express.json());install(app,()=>snapshot);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','x-it457-test':'1'},body:JSON.stringify(body)});
 try {
  assert.equal((await post('/api/test',{type:'cpu',confirmScaling:false})).status,400);
  snapshot.maximumCapacity=3;assert.equal((await post('/api/test',{type:'cpu',confirmScaling:true})).status,409);snapshot.maximumCapacity=2;
  assert.equal((await post('/api/test',{type:'cpu',confirmScaling:true,DocumentName:'AWS-RunShellScript',commands:['untrusted']})).status,202);
  assert.deepEqual(commands[0],{InstanceIds:['i-fixture'],DocumentName:'fixture-fixed-cpu',Parameters:{action:['start']}});
  assert.equal((await post('/api/test/stop',{})).status,200);assert.deepEqual(commands[1].Parameters,{action:['stop']});assert.equal((await(await fetch(base+'/api/test')).json()).job.status,'stopped');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
