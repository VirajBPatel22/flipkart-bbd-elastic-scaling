const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {saveRun}=require('../src/uiTests');
test('CPU results preserve measured latency and scaling outcome',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cpu-results-'));
 const previous=process.env.UI_RESULTS_DIR;process.env.UI_RESULTS_DIR=dir;
 try{
  for(const status of ['completed','incomplete','stopped','failed']){
   const run={id:status,type:'cpu',status,startedAt:'2026-11-20T00:00:00Z',finishedAt:'2026-11-20T00:06:00Z',rate:2,completed:2,success:2,failed:0,twoHealthy:status==='completed',samples:[{cpu:80},{cpu:100}],probeSamples:[{latency:10},{latency:30}]};
   await saveRun(run);
   const saved=JSON.parse(await fs.readFile(path.join(dir,'ui-'+status+'.summary.json')));
   assert.equal(saved.averageMs,20);assert.equal(saved.cpu,90);assert.equal(saved.status,status);assert.equal(saved.thresholdsPassed,status==='completed');assert.equal(saved.scenario,'cpu-scaling-observation');
  }
 }finally{if(previous===undefined)delete process.env.UI_RESULTS_DIR;else process.env.UI_RESULTS_DIR=previous;await fs.rm(dir,{recursive:true,force:true});}
});
