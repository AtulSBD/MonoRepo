import request from 'supertest';
import app from '../src/app'; 

describe('Health Endpoints', () => {
  it('GET /api/app-pref/health should return health info', async () => {
    const res = await request(app).get('/api/app-pref/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'Ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('memoryUsage');
    expect(res.body.memoryUsage).toHaveProperty('rss');
    expect(res.body.memoryUsage).toHaveProperty('heapTotal');
    expect(res.body.memoryUsage).toHaveProperty('heapUsed');
    expect(res.body.memoryUsage).toHaveProperty('external');
    expect(res.body).toHaveProperty('loadAverage');
    expect(Array.isArray(res.body.loadAverage)).toBe(true);
    expect(res.body).toHaveProperty('freeMemory');
    expect(res.body).toHaveProperty('totalMemory');
  });

  it('GET /api/app-pref-dev/health should return health info', async () => {
    const res = await request(app).get('/api/app-pref-dev/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'Ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('memoryUsage');
    expect(res.body.memoryUsage).toHaveProperty('rss');
    expect(res.body.memoryUsage).toHaveProperty('heapTotal');
    expect(res.body.memoryUsage).toHaveProperty('heapUsed');
    expect(res.body.memoryUsage).toHaveProperty('external');
    expect(res.body).toHaveProperty('loadAverage');
    expect(Array.isArray(res.body.loadAverage)).toBe(true);
    expect(res.body).toHaveProperty('freeMemory');
    expect(res.body).toHaveProperty('totalMemory');
  });
});

describe('Route Mounting', () => {
  it('should mount /api/app-pref/questionsAndAnswers', async () => {
    const res = await request(app).get('/api/app-pref/questionsAndAnswers');
    expect([200, 404, 401]).toContain(res.status);
  });


  it('should mount /api/app-pref-dev/questionsAndAnswers', async () => {
    const res = await request(app).get('/api/app-pref-dev/questionsAndAnswers');
    expect([200, 404, 401]).toContain(res.status);
  });


});