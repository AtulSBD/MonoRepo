import request from 'supertest';
import express from 'express';
import * as configService from '../src/services/config.service';
import * as config from '../src/env';
import app from '../src/app'; // If your Express app is exported separately

jest.mock('../src/services/config.service');


jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('Health Check Endpoints', () => {
  it('should return health status for /api/uup/health', async () => {
    const res = await request(app).get('/api/uup/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'Ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('memoryUsage');
    expect(res.body).toHaveProperty('loadAverage');
  });

  it('should return health status for /api/uup-dev/health', async () => {
    const res = await request(app).get('/api/uup-dev/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'Ok');
  });
});

describe('Cache Reload Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reload cache successfully for /api/uup/loadCache', async () => {
    (configService.setConfig as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).post('/api/uup/loadCache');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Cache reloaded' });
    expect(configService.setConfig).toHaveBeenCalledTimes(3);
    expect(configService.setConfig).toHaveBeenCalledWith('AIC');
    expect(configService.setConfig).toHaveBeenCalledWith('TD');
    expect(configService.setConfig).toHaveBeenCalledWith('ITERABLE');
  });

  it('should handle cache reload failure for /api/uup/loadCache', async () => {
    (configService.setConfig as jest.Mock).mockRejectedValue(new Error('Cache error'));

    const res = await request(app).post('/api/uup/loadCache');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Fail to load cache');
  });

  it('should reload cache successfully for /api/uup-dev/loadCache', async () => {
    (configService.setConfig as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).post('/api/uup-dev/loadCache');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Cache reloaded' });
  });
});
