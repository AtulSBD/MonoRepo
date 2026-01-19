import request from 'supertest';
import express from 'express';
import questionRoutes from '../src/routes/questionRoutes'; // adjust path as needed

// Mock controller functions
jest.mock('../src/controllers/questionController', () => ({
  uploadQuestions: jest.fn((req, res) => res.status(200).json({ message: 'Mocked uploadQuestions' })),
  downloadQuestions: jest.fn((req, res) => res.status(200).json({ message: 'Mocked downloadQuestions' })),
  getQuestions: jest.fn((req, res) => res.status(200).json({ message: 'Mocked getQuestions' })),
  deleteQuestion: jest.fn((req, res) => res.status(200).json({ message: 'Mocked deleteQuestion' })),
}));

// Setup Express app
const app = express();
app.use(express.json());
app.use('/questions', questionRoutes);

describe('Question Routes', () => {
  describe('POST /questions/upload', () => {
    it('should call uploadQuestions with valid .json file', async () => {
      const fileBuffer = Buffer.from(JSON.stringify({ key: 'value' }));
      const res = await request(app)
        .post('/questions/upload')
        .attach('file', fileBuffer, 'test.json');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mocked uploadQuestions');
    });

    it('should reject non-.json file', async () => {
      const fileBuffer = Buffer.from('This is a text file');
      const res = await request(app)
        .post('/questions/upload')
        .attach('file', fileBuffer, 'test.txt');
      expect(res.status).toBe(500);
      expect(res.text).toContain('Only .json files are allowed!');
    });
  });

  describe('GET /questions/download', () => {
    it('should call downloadQuestions', async () => {
      const res = await request(app).get('/questions/download');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mocked downloadQuestions');
    });
  });

  describe('GET /questions/:brandId/:locale?', () => {
    it('should call getQuestions with brandId and locale', async () => {
      const res = await request(app).get('/questions/CM/en-US');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mocked getQuestions');
    });

    it('should call getQuestions with brandId only', async () => {
      const res = await request(app).get('/questions/CM');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mocked getQuestions');
    });
  });

  describe('DELETE /questions/:brandId', () => {
    it('should call deleteQuestion with brandId', async () => {
      const res = await request(app).delete('/questions/CM');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mocked deleteQuestion');
    });
  });
});
