const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const { AutoScalingClient, DescribeAutoScalingGroupsCommand, DescribeScalingActivitiesCommand } = require('@aws-sdk/client-auto-scaling');
const { ElasticLoadBalancingV2Client, DescribeTargetHealthCommand } = require('@aws-sdk/client-elastic-load-balancing-v2');
const { CloudWatchClient, GetMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

// Dependency injection keeps all tests offline; production uses the instance role.
function createAwsAdapter(config = process.env, clients, clock = () => new Date()) {
  const region = config.AWS_REGION;
  clients ||= { ec2: new EC2Client({ region }), asg: new AutoScalingClient({ region }), elb: new ElasticLoadBalancingV2Client({ region }), cw: new CloudWatchClient({ region }) };
  async function snapshot() {
    for (const key of ['AWS_REGION', 'ASG_NAME', 'TARGET_GROUP_ARN', 'LOAD_BALANCER_ARN']) {
      if (!config[key]) throw new Error(`AWS monitoring requires ${key}`);
    }
    const now = clock();
    const [groupData, healthData, activities] = await Promise.all([
      clients.asg.send(new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [config.ASG_NAME] })),
      clients.elb.send(new DescribeTargetHealthCommand({ TargetGroupArn: config.TARGET_GROUP_ARN })),
      clients.asg.send(new DescribeScalingActivitiesCommand({ AutoScalingGroupName: config.ASG_NAME, MaxRecords: 30 }))
    ]);
    const group = groupData.AutoScalingGroups?.[0];
    if (!group) throw new Error('Configured Auto Scaling Group was not found');
    const members = group.Instances || [], ids = members.map(i => i.InstanceId);
    const ec2 = ids.length ? await clients.ec2.send(new DescribeInstancesCommand({ InstanceIds: ids })) : { Reservations: [] };
    const descriptions = (ec2.Reservations || []).flatMap(r => r.Instances || []);
    const lb = config.LOAD_BALANCER_ARN.split(':loadbalancer/')[1];
    const tg = config.TARGET_GROUP_ARN.split(':')[5];
    if (!lb || !tg?.startsWith('targetgroup/')) throw new Error('Invalid load balancer or target group ARN');
    const queries = [];
    function metric(id, namespace, name, dimensions, stat, unit) {
      queries.push({ Id: id, MetricStat: { Metric: { Namespace: namespace, MetricName: name, Dimensions: dimensions }, Period: 60, Stat: stat, ...(unit ? { Unit: unit } : {}) }, ReturnData: true });
    }
    const albDims = [{ Name: 'LoadBalancer', Value: lb }, { Name: 'TargetGroup', Value: tg }];
    metric('requests', 'AWS/ApplicationELB', 'RequestCount', albDims, 'Sum');
    metric('latency', 'AWS/ApplicationELB', 'TargetResponseTime', albDims, 'Average');
    metric('p95', 'AWS/ApplicationELB', 'TargetResponseTime', albDims, 'p95');
    metric('errors4', 'AWS/ApplicationELB', 'HTTPCode_Target_4XX_Count', albDims, 'Sum');
    metric('errors5', 'AWS/ApplicationELB', 'HTTPCode_Target_5XX_Count', albDims, 'Sum');
    metric('fleet_cpu', 'AWS/EC2', 'CPUUtilization', [{ Name: 'AutoScalingGroupName', Value: config.ASG_NAME }], 'Average');
    ids.forEach((id, i) => {
      metric(`cpu_${i}`, 'AWS/EC2', 'CPUUtilization', [{ Name: 'InstanceId', Value: id }], 'Average');
      const dims = [{ Name: 'InstanceId', Value: id }, { Name: 'AutoScalingGroupName', Value: config.ASG_NAME }];
      metric(`mem_${i}`, 'CWAgent', 'mem_used', dims, 'Average');
      metric(`mempct_${i}`, 'CWAgent', 'mem_used_percent', dims, 'Average');
    });
    // Prefer completed minutes; expose their timestamp and lag rather than pretending real-time data.
    const end = new Date(Math.floor(now.getTime() / 60000) * 60000 - 60000);
    const start = new Date(end.getTime() - 5 * 60000);
    let results = [], next;
    do {
      const page = await clients.cw.send(new GetMetricDataCommand({ MetricDataQueries: queries, StartTime: start, EndTime: end, ScanBy: 'TimestampDescending', ...(next ? { NextToken: next } : {}) }));
      results.push(...(page.MetricDataResults || [])); next = page.NextToken;
    } while (next);
    const warnings = results.filter(r => r.StatusCode && r.StatusCode !== 'Complete').map(r => `${r.Id}: ${r.StatusCode}`);
    const series = id => results.filter(r => r.Id === id).flatMap(r => {
      if (r.StatusCode && r.StatusCode !== 'Complete') return [];
      return (r.Timestamps || []).map((t, i) => ({ at: new Date(t).getTime(), value: r.Values?.[i] })).filter(p => Number.isFinite(p.value));
    }).sort((a, b) => b.at - a.at);
    const latest = id => series(id)[0]?.value ?? null;
    const requestPoint = series('requests')[0];
    const atRequest = id => requestPoint ? series(id).find(p => p.at === requestPoint.at)?.value ?? null : null;
    const count = requestPoint?.value ?? null;
    // ALB suppresses zero-valued target-error series; absent error points for an observed request minute mean zero.
    const errorsComplete = !results.some(r => ['errors4','errors5'].includes(r.Id) && r.StatusCode && r.StatusCode !== 'Complete');
    const failures = count > 0 && errorsComplete ? (atRequest('errors4') ?? 0) + (atRequest('errors5') ?? 0) : null;
    const instances = members.map((member, i) => {
      const detail = descriptions.find(d => d.InstanceId === member.InstanceId);
      const target = healthData.TargetHealthDescriptions?.find(t => t.Target?.Id === member.InstanceId);
      return { id: member.InstanceId, state: detail?.State?.Name || 'unavailable', lifecycle: member.LifecycleState,
        health: target?.TargetHealth?.State || 'unregistered', cpu: latest(`cpu_${i}`), memoryBytes: latest(`mem_${i}`), memoryPercent: latest(`mempct_${i}`),
        metricTimestamp: series(`cpu_${i}`)[0] ? new Date(series(`cpu_${i}`)[0].at).toISOString() : null,
        uptimeSeconds: detail?.LaunchTime ? Math.max(0, (now - new Date(detail.LaunchTime)) / 1000) : null, requests: null };
    });
    const knownMemory = instances.map(i => i.memoryBytes).filter(Number.isFinite);
    const knownPercent = instances.map(i => i.memoryPercent).filter(Number.isFinite);
    const events = (activities.Activities || []).map(a => ({ id: a.ActivityId, timestamp: a.StartTime?.toISOString?.() || a.StartTime, endTimestamp: a.EndTime, message: a.Description, status: a.StatusCode, cause: a.Cause }));
    return { environment: 'AWS', source: 'EC2 + Auto Scaling + ALB target health + CloudWatch', timestamp: now.toISOString(),
      metricTimestamp: requestPoint ? new Date(requestPoint.at).toISOString() : null, metricWindowSeconds: 60,
      metricQueryStart: start.toISOString(), metricQueryEnd: end.toISOString(), metricWarnings: [...new Set(warnings)],
      desiredCapacity: group.DesiredCapacity, minimumCapacity: group.MinSize, maximumCapacity: group.MaxSize,
      replicaCount: members.filter(i => i.LifecycleState === 'InService').length,
      runningCount: instances.filter(i => i.state === 'running').length,
      healthyCount: instances.filter(i => i.health === 'healthy' && i.lifecycle === 'InService').length,
      cpu: latest('fleet_cpu'), memoryBytes: knownMemory.length === instances.length && instances.length ? knownMemory.reduce((a,b)=>a+b,0) : null,
      memoryPercent: knownPercent.length ? knownPercent.reduce((a,b)=>a+b,0)/knownPercent.length : null,
      requestRate: count === null ? null : count/60, averageMs: atRequest('latency') === null ? null : atRequest('latency')*1000,
      p95Ms: atRequest('p95') === null ? null : atRequest('p95')*1000, errorRate: failures === null ? null : failures/count,
      instances, events, distributionUnavailable: 'Per-instance request distribution is not provided by these AWS metrics.' };
  }
  return { snapshot };
}
module.exports = { createAwsAdapter };
