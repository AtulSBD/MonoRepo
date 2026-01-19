import request from 'supertest';
import express from 'express';
import preferenceRoutes from '../src/routes/preferenceRoutes'; // adjust path as needed

const app = express();
app.use(express.json());
app.use('/preferences', preferenceRoutes);

jest.mock('../src/controllers/preferenceController', () => ({
  getPreferences: jest.fn((req, res) => {
    res.status(200).json({ message: 'Mocked getPreferences' });
  }),
  createPreference: jest.fn((req, res) => {
    res.status(201).json({ message: 'Mocked createPreference' });
  }),
  updatePreference: jest.fn((req, res) => {
    res.status(200).json({ message: 'Mocked updatePreference' });
  }),
  deletePreference: jest.fn((req, res) => {
    res.status(200).json({ message: 'Mocked deletePreference' });
  }),
}));


describe('Preference Routes', () => {
  describe('GET /preferences/:brandId/:locale', () => {
    it('should call getPreferences with valid brandId and locale', async () => {
      const res = await request(app).get('/preferences/CM/en-US');
      expect(res.status).not.toBe(400); 
    });
  });

  describe('GET /preferences/:param', () => {
    it('should return 400 if param is a locale and brandId is missing', async () => {
      const res = await request(app).get('/preferences/en-US');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Brand ID is required');
    });

    it('should return 400 if param is not a locale and locale is missing', async () => {
      const res = await request(app).get('/preferences/CM');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Locale is required');
    });
  });

  describe('GET /preferences/', () => {
    it('should return 400 if both brandId and locale are missing', async () => {
      const res = await request(app).get('/preferences/');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Brand ID and Locale are required');
    });
  });

  describe('DELETE /preferences/:brandId/:locale', () => {
    it('should call deletePreference with valid brandId and locale', async () => {
      const res = await request(app).delete('/preferences/CM/en-US');
      expect(res.status).not.toBe(400);
    });
  });

  describe('DELETE /preferences/:param', () => {
    it('should return 400 if param is a locale and brandId is missing', async () => {
      const res = await request(app).delete('/preferences/en-US');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Brand ID is required');
    });

    it('should return 400 if param is not a locale and locale is missing', async () => {
      const res = await request(app).delete('/preferences/CM');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Locale is required');
    });
  });

  describe('DELETE /preferences/', () => {
    it('should return 400 if both brandId and locale are missing', async () => {
      const res = await request(app).delete('/preferences/');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Brand ID and Locale are required');
    });
  });

  describe('POST /preferences/', () => {
    it('should call createPreference', async () => {
      const res = await request(app).post('/preferences/').send({ /* sample payload */ });
      expect(res.status).not.toBe(400); // Assuming controller handles valid case
    });
  });

  describe('PUT /preferences/', () => {
    it('should call updatePreference', async () => {
      const res = await request(app).put('/preferences/').send({ /* sample payload */ });
      expect(res.status).not.toBe(400); // Assuming controller handles valid case
    });
  });
});
