function handleJson(methodName, shape) {
  return (service) => async (req, res, next) => {
    try {
      const value = await service[methodName]();
      res.status(200).json(shape ? shape(value) : value);
    } catch (error) {
      next(error);
    }
  };
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function rowsToCsv(rows) {
  const columns = [
    'timestamp',
    'scenario',
    'replicas',
    'rate',
    'totalRequests',
    'throughput',
    'averageMs',
    'p95Ms',
    'failureRate',
  ];
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\r\n');
}

function getExperimentsCsv(service) {
  return async (req, res, next) => {
    try {
      const rows = await service.getExperiments();
      res.type('text/csv; charset=utf-8').send(rowsToCsv(rows));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  getOverview: handleJson('getOverview'),
  getHistory: handleJson('getHistory'),
  getEvents: handleJson('getEvents'),
  getExperiments: handleJson('getExperiments'),
  getExperimentsCsv,
  rowsToCsv,
};
