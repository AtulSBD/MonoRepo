
import request from 'supertest';
import express from 'express';
import { getPreferences, createPreference, updatePreference, deletePreference } from '../src/controllers/preferenceController';
import Question from '../src/models/questionModel';
import { validateBrandId } from '../src/utils/validateBrandId';
import { validateLocale } from '../src/utils/validateLocale';
import { errorResponse, successResponse } from '../src/utils/responseWrapper';
import { sendLogToNewRelic } from '../src/utils/newRelicLogger';


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

const app = express();
app.use(express.json());
app.get('/preferences/:brandId/:locale', getPreferences);
app.post('/preferences', createPreference);
app.put('/preferences', updatePreference);

describe('Preferences Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /preferences/:brandId/:locale', () => {

    it('should return 400 if brandId is missing', async () => {
      const req: any = {
        params: { brandId: '', locale: 'en-US' },
      };

      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPreferences(req, res);

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

      await getPreferences(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(errorResponse('Locale is required'));
    });

    it('should return 400 if brandId is invalid', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(false);
      const res = await request(app).get('/preferences/invalid/en-US');
      expect(res.status).toBe(400);
    });

    it('should return 400 if locale is invalid', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(false);
      const res = await request(app).get('/preferences/DW/invalid');
      expect(res.status).toBe(400);
    });

    it('should return 404 if locale not found for brand', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.exists as jest.Mock).mockResolvedValue(false);
      const res = await request(app).get('/preferences/DW/en-US');
      expect(res.status).toBe(404);
    });

    it('should return 400 if no preferences found', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.exists as jest.Mock).mockResolvedValue(true);
      (Question.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
      const res = await request(app).get('/preferences/DW/en-US');
      expect(res.status).toBe(400);
    });

    it('should return 200 with preferences', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.exists as jest.Mock).mockResolvedValue(true);
      (Question.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([{ questionId: 'Q1' }]),
      });
      const res = await request(app).get('/preferences/DW/en-US');
      expect(res.status).toBe(200);
    });

    it('should return 500 on unexpected error', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.exists as jest.Mock).mockResolvedValue(true);
      (sendLogToNewRelic as jest.Mock).mockImplementation(() => { });
      (Question.find as jest.Mock).mockReturnValue(null)

      const res = await request(app).get('/preferences/DW/en-US');
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Server error');
    });

  });

  describe('POST /preferences', () => {
    it('should return 400 if all required fields are missing', async () => {
      const res = await request(app).post('/preferences').send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 if some required fields are missing', async () => {
      const res = await request(app).post('/preferences').send({ brandId: 'DW' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if brandId is invalid', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(false);
      const res = await request(app).post('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if locale is invalid', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(false);
      const res = await request(app).post('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(400);
    });

    it('should return 201 if preference is created', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.findOneAndUpdate as jest.Mock).mockResolvedValue({ questionId: 'Q1' });
      const res = await request(app).post('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(201);
    });
    it('should return 500 on unexpected error', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.exists as jest.Mock).mockResolvedValue(true);
      (sendLogToNewRelic as jest.Mock).mockImplementation(() => { });
      (Question.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error('Error creating preference'));

      const res = await request(app).post('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Error creating preference');
    });
  });

  describe('PUT /preferences', () => {
    it('should return 400 if all required fields are missing', async () => {
      const res = await request(app).put('/preferences').send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 if some required fields are missing', async () => {
      const res = await request(app).put('/preferences').send({ brandId: 'DW' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if brandId is invalid', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(false);
      const res = await request(app).put('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if locale is invalid', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(false);
      const res = await request(app).put('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(400);
    });

    it('should return 404 if preference not found', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
      const res = await request(app).put('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(404);
    });

    it('should return 200 if preference is updated', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.findOneAndUpdate as jest.Mock).mockResolvedValue({ questionId: 'Q1' });
      const res = await request(app).put('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(200);
    });

    it('should return 500 on unexpected error', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.exists as jest.Mock).mockResolvedValue(true);
      (sendLogToNewRelic as jest.Mock).mockImplementation(() => { });
      (Question.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error('Error updating preference'))

      const res = await request(app).put('/preferences').send({ brandId: 'DW', questionId: 'Q1', locale: 'en-US' });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Error updating preference');
    });
  });


  describe('deletePreference', () => {
    const mockRes = () => {
      const res: any = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 400 if brandId is missing', async () => {
      const req: any = { params: { brandId: '', locale: 'en-US' } };
      const res = mockRes();

      await deletePreference(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(errorResponse('Brand ID is required'));
    });

    it('should return 400 if locale is missing', async () => {
      const req: any = { params: { brandId: 'DW', locale: '' } };
      const res = mockRes();

      await deletePreference(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(errorResponse('Locale is required'));
    });

    it('should return 400 if brandId is invalid', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(false);

      const req: any = { params: { brandId: 'invalid', locale: 'en-US' } };
      const res = mockRes();

      await deletePreference(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(errorResponse('Invalid brandId'));
    });

    it('should return 400 if locale is invalid', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(false);

      const req: any = { params: { brandId: 'DW', locale: 'invalid' } };
      const res = mockRes();

      await deletePreference(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(errorResponse('Invalid Locale'));
    });

    it('should return 400 if preference not found', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      const req: any = { params: { brandId: 'DW', locale: 'en-US' } };
      const res = mockRes();

      await deletePreference(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(errorResponse('Preference not found'));
    });

    it('should return 200 if preference is deleted', async () => {
      const mockDeleted = { questionId: 'Q1' };

      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.findOneAndDelete as jest.Mock).mockResolvedValue(mockDeleted);

      const req: any = { params: { brandId: 'DW', locale: 'en-US' } };
      const res = mockRes();
      (sendLogToNewRelic as jest.Mock).mockImplementation(() => { })
      await deletePreference(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(successResponse('Preference deleted', mockDeleted));
    });

    it('should return 500 on internal error', async () => {
      (validateBrandId as jest.Mock).mockResolvedValue(true);
      (validateLocale as jest.Mock).mockResolvedValue(true);
      (Question.findOneAndDelete as jest.Mock).mockRejectedValue(new Error('DB error'));

      const req: any = { params: { brandId: 'DW', locale: 'en-US' } };
      const res = mockRes();
      (sendLogToNewRelic as jest.Mock).mockImplementation(() => { })
      await deletePreference(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(errorResponse('Server error', 500));
    });
  });

});
