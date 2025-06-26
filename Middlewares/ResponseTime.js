const responseTime = (req, res, next) => {
  const start = process.hrtime();

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2);

    const used = process.memoryUsage(); // ✅ FIXED HERE

    if (typeof body === "object" && body !== null) {
      body.responseTime = `${timeInMs}ms`;
      body.memory = {
        rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      };
    }

    return originalJson(body);
  };

  next();
};

module.exports = responseTime;
