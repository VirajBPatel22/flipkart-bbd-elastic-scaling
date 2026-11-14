const test = require('node:test');
const assert = require('node:assert/strict');
const { createAwsAdapter } = require('../src/adapters/aws');
const config = { AWS_REGION: 'ap-south-1', ASG_NAME: 'bbd-backend', LOAD_BALANCER_ARN: 'arn:aws:elasticloadbalancing:ap-south-1:123456789012:loadbalancer/app/bbd/123', TARGET_GROUP_ARN: 'arn:aws:elasticloadbalancing:ap-south-1:123456789012:targetgroup/backend/456' };
function fixture(metricResults) {
  const at = new Date('2026-01-01T12:00:00Z');
  const metrics = metricResults ?? [{ Id:'requests', Values:[120], Timestamps:[at] },{ Id:'latency', Values:[.1], Timestamps:[at] },{ Id:'p95', Values:[.3], Timestamps:[at] },{ Id:'errors5', Values:[6], Timestamps:[at] },{ Id:'fleet_cpu',Values:[55],Timestamps:[at] }];
  const commands=[];
  return { commands, clients: {
    asg: { send: async command => command.constructor.name === 'DescribeAutoScalingGroupsCommand' ? {AutoScalingGroups:[{DesiredCapacity:3,MinSize:1,MaxSize:3,Instances:[{InstanceId:'i-one',LifecycleState:'InService'},{InstanceId:'i-two',LifecycleState:'Pending'}]}]} : {Activities:[{ActivityId:'event1',StartTime:at,Description:'Launching EC2 instance',StatusCode:'InProgress'}]} },
    ec2: {send:async()=>({Reservations:[{Instances:[{InstanceId:'i-one',State:{Name:'running'},LaunchTime:at},{InstanceId:'i-two',State:{Name:'pending'}}]}]})},
    elb: {send:async()=>({TargetHealthDescriptions:[{Target:{Id:'i-one'},TargetHealth:{State:'healthy'}},{Target:{Id:'i-two'},TargetHealth:{State:'initial'}}]})},
    cw: {send:async command=>{commands.push(command.input);return {MetricDataResults:metrics};}}
  }};
}
test('AWS keeps desired, InService and healthy counts separate and converts seconds to milliseconds',async()=>{
  const f=fixture();const result=await createAwsAdapter(config,f.clients,()=>new Date('2026-01-01T12:03:00Z')).snapshot();
  assert.equal(result.desiredCapacity,3);assert.equal(result.replicaCount,1);assert.equal(result.healthyCount,1);
  assert.equal(result.requestRate,2);assert.equal(result.averageMs,100);assert.equal(result.p95Ms,300);assert.equal(result.errorRate,.05);
  assert.equal(result.memoryBytes,null);assert.equal(result.instances[0].requests,null);assert.equal(result.events[0].id,'event1');
  assert.equal(f.commands[0].EndTime.toISOString(),'2026-01-01T12:02:00.000Z');
  const q=f.commands[0].MetricDataQueries.find(q=>q.Id==='requests');assert.equal(q.MetricStat.Metric.Dimensions.length,2);
});
test('idle or unpublished metrics remain unavailable',async()=>{
  const f=fixture([]);const r=await createAwsAdapter(config,f.clients).snapshot();
  for(const k of ['requestRate','averageMs','p95Ms','errorRate','cpu','memoryBytes','metricTimestamp']) assert.equal(r[k],null,k);
});
test('latency from a different minute is not combined with request counts',async()=>{
  const f=fixture([{Id:'requests',Values:[10],Timestamps:[new Date('2026-01-01T12:00:00Z')]},{Id:'latency',Values:[9],Timestamps:[new Date('2026-01-01T11:59:00Z')]}]);
  const r=await createAwsAdapter(config,f.clients).snapshot();assert.equal(r.averageMs,null);assert.equal(r.errorRate,0);
});
test('AWS access denial propagates without inventing local or AWS values',async()=>{
  const f=fixture();f.clients.asg.send=async()=>{throw new Error('AccessDenied')};
  await assert.rejects(createAwsAdapter(config,f.clients).snapshot(),/AccessDenied/);
});
test('required configuration and missing ASG are explicit errors',async()=>{
  const f=fixture();await assert.rejects(createAwsAdapter({},f.clients).snapshot(),/AWS_REGION/);
  f.clients.asg.send=async()=>({});await assert.rejects(createAwsAdapter(config,f.clients).snapshot(),/not found/);
});

test('partial error metric data never appears as a healthy zero error rate',async()=>{
  const f=fixture([{Id:'requests',Values:[10],Timestamps:[new Date('2026-01-01T12:00:00Z')]},{Id:'errors5',StatusCode:'InternalError',Values:[],Timestamps:[]}]);
  const r=await createAwsAdapter(config,f.clients).snapshot();assert.equal(r.errorRate,null);assert.ok(r.metricWarnings.includes('errors5: InternalError'));
});
