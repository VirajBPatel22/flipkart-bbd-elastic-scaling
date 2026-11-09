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
