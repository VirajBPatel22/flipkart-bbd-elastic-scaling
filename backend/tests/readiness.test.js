const test = require('node:test');
const assert = require('node:assert/strict');
const { getReadiness } = require('../src/controllers/health.controller');
test('readiness returns a sanitized failure without database details',async()=>{
  const configPath=require.resolve('../src/config/db');const before=require.cache[configPath];
  require.cache[configPath]={id:configPath,filename:configPath,loaded:true,exports:{getPool:()=>({query:async()=>{throw new Error('private-host/password')}})}};
  const result={statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.value=value;}};
  try{await getReadiness({},result);assert.equal(result.statusCode,503);assert.deepEqual(result.value,{status:'unavailable',database:'unavailable'});}
  finally{if(before)require.cache[configPath]=before;else delete require.cache[configPath];}
});
