const {test}=require('node:test');const assert=require('node:assert/strict');const express=require('express');
const {AutoScalingClient}=require('@aws-sdk/client-auto-scaling');const {install}=require('../src/uiTests');
test('manual capacity controls use fixed ASG and reject untrusted capacity and origins',async(t)=>{
 process.env.ENVIRONMENT='AWS';process.env.DASHBOARD_TESTS_ENABLED='true';process.env.ASG_NAME='project-backend';
 const commands=[];t.mock.method(AutoScalingClient.prototype,'send',async command=>{commands.push(command.input);return {};});
 const app=express();app.use(express.json());install(app,()=>({minimumCapacity:1,maximumCapacity:2}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const post=(body,headers={})=>fetch(`http://127.0.0.1:${server.address().port}/api/test/capacity`,{method:'POST',headers:{'Content-Type':'application/json','x-it457-test':'1',...headers},body:JSON.stringify(body)});
 try{
 assert.equal((await post({desiredCapacity:3})).status,400);
 assert.equal((await post({desiredCapacity:2},{origin:'https://other.example'})).status,403);
 for(const n of [2,1])assert.equal((await post({desiredCapacity:n,AutoScalingGroupName:'other'})).status,200);
 assert.deepEqual(commands,[2,1].map(n=>({AutoScalingGroupName:'project-backend',DesiredCapacity:n,HonorCooldown:false})));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
