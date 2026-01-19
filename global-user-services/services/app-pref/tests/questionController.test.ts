import request from 'supertest';
import express from 'express';
import multer from 'multer';
import { getQuestions, uploadQuestions, downloadQuestions, deleteQuestion } from '../src/controllers/questionController';
import Question from '../src/models/questionModel';
import { validateBrandId } from '../src/utils/validateBrandId';
import { validateLocale } from '../src/utils/validateLocale';
import { sendLogToNewRelic } from '../src/utils/newRelicLogger';
import { errorResponse } from '../src/utils/responseWrapper';

// Mock dependencies
jest.mock('../src/models/questionModel', () => ({
  __esModule: true,
  default: {
    exists: jest.fn(),
    find: jest.fn(() => ({
      select: jest.fn().mockResolvedValue([]), // or mockResolvedValue([{...}]) for success case
    })),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn()
  },
}));


jest.mock('../src/utils/validateBrandId', () => ({
  validateBrandId: jest.fn()
}));
jest.mock('../src/utils/validateLocale', () => ({
  validateLocale: jest.fn()
}));

jest.mock('../src/utils/newRelicLogger', () => ({
  sendLogToNewRelic: jest.fn()
}))

// Setup Express app
const app = express();
app.use(express.json());

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
app.get('/questions/:brandId/:locale', getQuestions);
app.post('/questions/upload', upload.single('file'), uploadQuestions);
app.get('/questions/download', downloadQuestions);
app.delete('/questions/:brandId', deleteQuestion);

// Begin tests
describe('Questions Controller', () => {
  // GET /questions/:brandId/:locale
 describe('GET /questions/:brandId/:locale', () => {
  it('should return 400 if brandId is missing', async () => {
    const req: any = {
            params: { brandId: '', locale: 'en-US' },
          };
    
          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          };
    
          await getQuestions(req, res);
    
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith(errorResponse('Brand ID is required'));
  });

  it('should return 400 if locale is missing', async () => {
          const req: any = {
            params: { brandId: 'CM', locale: '' },
          };
    
          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          };
    
          await getQuestions(req, res);
    
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith(errorResponse('Locale is required'));
  });

  it('should return 400 if brandId is invalid', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(false);
    const res = await request(app).get('/questions/invalid/en-US');
    expect(res.status).toBe(400);
  });

  it('should return 400 if locale is invalid', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (validateLocale as jest.Mock).mockResolvedValue(false);
    const res = await request(app).get('/questions/CM/invalid');
    expect(res.status).toBe(400);
  });

  it('should return 404 if locale not found for brand', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (validateLocale as jest.Mock).mockResolvedValue(true);
    (Question.exists as jest.Mock).mockResolvedValue(false);
    const res = await request(app).get('/questions/CM/en-US');
    expect(res.status).toBe(404);
  });

  it('should return 404 if no questions found', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (validateLocale as jest.Mock).mockResolvedValue(true);
    (Question.exists as jest.Mock).mockResolvedValue(true);
    (Question.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });
    const res = await request(app).get('/questions/CM/en-US');
    expect(res.status).toBe(404);
  });

  it('should return 200 with questions', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (validateLocale as jest.Mock).mockResolvedValue(true);
    (Question.exists as jest.Mock).mockResolvedValue(true);
    (Question.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([{ questionId: 'Q1' }]),
    });
    const res = await request(app).get('/questions/CM/en-US');
    expect(res.status).toBe(200);
  });

  it('should return 500 on unexpected error', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (validateLocale as jest.Mock).mockResolvedValue(true);
    (Question.exists as jest.Mock).mockResolvedValue(true);
    (Question.find as jest.Mock).mockImplementation(() => {
      throw new Error('Unexpected error');
    });
    const res = await request(app).get('/questions/CM/en-US');
    expect(res.status).toBe(500);
  });
});
  // POST /questions/upload
describe('POST /questions/upload', () => {
  it('should return 400 if no file is uploaded', async () => {
    const res = await request(app).post('/questions/upload');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No file uploaded');
  });

  it('should return 400 if brandId is missing in file', async () => {
    const file = Buffer.from(JSON.stringify({ questionId: 'Q1', locale: 'en-US' }));
    const res = await request(app)
      .post('/questions/upload')
      .attach('file', file, 'questions.json');
    expect(res.status).toBe(400);
  });

  it('should return 400 if questionId is missing', async () => {
    const file = Buffer.from(JSON.stringify({ brandId: 'CM', locale: 'en-US' }));
    const res = await request(app)
      .post('/questions/upload')
      .attach('file', file, 'questions.json');
    expect(res.status).toBe(400);
  });

  it('should return 400 if locale is missing', async () => {
    const file = Buffer.from(JSON.stringify({ brandId: 'CM', questionId: 'Q1' }));
    const res = await request(app)
      .post('/questions/upload')
      .attach('file', file, 'questions.json');
    expect(res.status).toBe(400);
  });

  it('should return 200 if question is uploaded successfully', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (validateLocale as jest.Mock).mockResolvedValue(true);
    (Question.findOneAndUpdate as jest.Mock).mockResolvedValue({ questionId: 'Q1' });

    const file = Buffer.from(JSON.stringify({ brandId: 'CM', questionId: 'Q1', locale: 'en-US' }));
    const res = await request(app)
      .post('/questions/upload')
      .attach('file', file, 'questions.json');
    expect(res.status).toBe(200);
  });

  it('should return 500 on unexpected error', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (validateLocale as jest.Mock).mockResolvedValue(true);
    (Question.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error('DB error'));

    const file = Buffer.from(JSON.stringify({ brandId: 'CM', questionId: 'Q1', locale: 'en-US' }));
    const res = await request(app)
      .post('/questions/upload')
      .attach('file', file, 'questions.json');
    expect(res.status).toBe(500);
  });
});
  // GET /questions/download
describe('GET /questions/download', () => {
  it('should return 404 if no questions found', async () => {
    (Question.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });
    const res = await request(app).get('/questions/download');
    expect(res.status).toBe(404);
  });

  it('should return 200 and download questions', async () => {
    const mockQuestions = [{ questionId: 'Q1', answers: ['A1'] }];
    (Question.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockQuestions),
    });

    const res = await request(app).get('/questions/download');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('should return 500 on unexpected error', async () => {
    (Question.find as jest.Mock).mockImplementation(() => {
      throw new Error('Unexpected error');
    });
    const res = await request(app).get('/questions/download');
    expect(res.status).toBe(500);
  });
});

describe('DELETE /questions/:brandId', () => {
  it('should return 400 if brandId is missing', async () => {
    const req: any = {
            params: { brandId: '', locale: 'en-US' },
          };
    
          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          };
    
          await deleteQuestion(req, res);
    
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith(errorResponse('Invalid brandId'));
  });

  it('should return 400 if brandId is invalid', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(false);
    const res = await request(app).delete('/questions/invalidBrand');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid brandId');
  });

  it('should return 404 if question not found', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (Question.findOneAndDelete as jest.Mock).mockResolvedValue(null);
    const res = await request(app).delete('/questions/CM');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Question not found');
  });

  it('should return 200 if question is deleted successfully', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (Question.findOneAndDelete as jest.Mock).mockResolvedValue({ questionId: 'Q1' });
    const res = await request(app).delete('/questions/CM');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Question deleted successfully');
  });

  it('should return 500 on unexpected error', async () => {
    (validateBrandId as jest.Mock).mockResolvedValue(true);
    (Question.findOneAndDelete as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await request(app).delete('/questions/CM');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error deleting question');
  });
});

});




