import axios from 'axios';
import mongoose from 'mongoose';
import { getUserProfile, getAccessTokenByUUID, triggerEmailVerification, validateEmail, validateRequest, validateRequestSupport, updateEmailPref } from '../src/Utils/changeEmailUtil';
import { getConfig } from '../src/services/config.service';
import connectDB from '../src/config/db';

jest.mock('axios');
jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../src/services/config.service', () => ({
  getConfig: jest.fn()
}));
jest.mock("../src/Utils/shared", () => ({
  validateEmail: jest.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  validateRequiredField: jest.fn(),
  validateBrandAndRegion: jest.fn(),
  validatePassword: jest.fn(),
  validateConfirmPassword: jest.fn(),
  getMarketIdByLanguage: jest.fn().mockResolvedValue('US'),
  APP_IDS: { AIC: 'AIC' }
}));

import * as shared from "../src/Utils/shared";

describe("changeEmailUtils", () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });

  describe('validateRequest', () => {
    it('should return null for valid input', () => {
      const body = {
        currentEmail: 'test1@example.com',
        newEmail: 'test2@example.com',
        password: 'securePass123'
      };
      expect(validateRequest(body)).toBeNull();
    });

    it('should return error for missing fields', () => {
      expect(validateRequest({ currentEmail: '', newEmail: '', password: '' }))
        .toBe('currentEmail, newEmail, and password fields are required.');
    });

    it('should return error for invalid email format', () => {
      expect(validateRequest({ currentEmail: 'bad', newEmail: 'bad', password: 'pass' }))
        .toBe('Invalid email format.');
    });
  });

  describe('validateRequestSupport', () => {
    it('should return null for valid input', () => {
      const body = {
        currentEmail: 'test1@example.com',
        newEmail: 'test2@example.com',
        isDuploUser: true,
        isPolarisUser: false
      };
      expect(validateRequestSupport(body)).toBeNull();
    });

    it('should return error for missing fields', () => {
      expect(validateRequestSupport({ currentEmail: '', newEmail: '', isDuploUser: true, isPolarisUser: false }))
        .toBe('currentEmail and newEmail fields are required.');
    });

    it('should return error for non-boolean flags', () => {
      expect(validateRequestSupport({ currentEmail: 'a@b.com', newEmail: 'b@c.com', isDuploUser: 'yes' as any, isPolarisUser: 'no' as any }))
        .toBe('isDuploUser and isPolarisUser must be boolean values.');
    });

    it('should return error if both flags are same', () => {
      expect(validateRequestSupport({ currentEmail: 'a@b.com', newEmail: 'b@c.com', isDuploUser: true, isPolarisUser: true }))
        .toBe('isDuploUser and isPolarisUser cannot both be true or both be false.');
    });

    it('should return error for invalid email format', () => {
      expect(validateRequestSupport({ currentEmail: 'bad', newEmail: 'bad', isDuploUser: true, isPolarisUser: false }))
        .toBe('Invalid email format.');
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile on success', async () => {
      (getConfig as jest.Mock).mockReturnValue({
        entity: 'User',
        ownerId: 'owner',
        ownerSecret: 'secret'
      });

      (axios.get as jest.Mock).mockResolvedValue({
        data: { result: { uuid: '123', MUUID: '456' } }
      });
      (shared.validateBrandAndRegion as jest.Mock).mockResolvedValue(true);

      const result = await getUserProfile('test@example.com', 'pass', 'CM', 'NA', 'en-US');
      expect(result).toEqual({ uuid: '123', MUUID: '456' });
    });

    it('should return null on 404', async () => {
      (axios.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
      const result = await getUserProfile('test@example.com', 'pass', 'brand1', 'region1', 'en-US');
      expect(result).toBeNull();
    });

    it('should return null on 401', async () => {
      (axios.get as jest.Mock).mockRejectedValue({ response: { status: 401 } });
      const result = await getUserProfile('test@example.com', 'pass', 'brand1', 'region1', 'en-US');
      expect(result).toBeNull();
    });

    it('should return null on other errors', async () => {
      (axios.get as jest.Mock).mockRejectedValue({ response: { status: 500 } });
      const result = await getUserProfile('test@example.com', 'pass', 'brand1', 'region1', 'en-US');
      expect(result).toBeNull();
    });
  });

  describe('getAccessTokenByUUID', () => {
    it('should return access token on success', async () => {
      (getConfig as jest.Mock).mockReturnValue({
        entity: 'User',
        ownerId: 'owner',
        ownerSecret: 'secret'
      });

      (axios.get as jest.Mock).mockResolvedValue({
        data: { accessToken: 'token123' }
      });
      (shared.validateBrandAndRegion as jest.Mock).mockResolvedValue(true);

      const result = await getAccessTokenByUUID('uuid123', 'brand1', 'region1', 'en-US');
      expect(result).toBe('token123');
    });

    it('should return null on error', async () => {
      (axios.get as jest.Mock).mockRejectedValue({ response: { status: 500 } });
      const result = await getAccessTokenByUUID('uuid123', 'brand1', 'region1', 'en-US');
      expect(result).toBeNull();
    });
  });

  describe('triggerEmailVerification', () => {
    it('should return true on success', async () => {
      (getConfig as jest.Mock).mockReturnValue({
        clientId: 'client',
        flow: 'flow',
        flowVersion: 'v1',
        ownerId: 'owner',
        ownerSecret: 'secret'
      });

      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });
      (shared.validateBrandAndRegion as jest.Mock).mockResolvedValue(true);

      const result = await triggerEmailVerification('token', 'new@example.com', 'CM', 'NA', 'en-US', true);
      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('fail'));
      const result = await triggerEmailVerification('token', 'new@example.com', 'CM', 'NA', 'en-US', true);
      expect(result).toBe(false);
    });
  });

  describe('updateEmailPref', () => {
    const mockFindOneAndUpdate = jest.fn();
    const mockInsertOne = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();

      (mongoose.connection.collection as jest.Mock) = jest.fn((name: string) => {
        if (name === 'userPref') {
          return { findOneAndUpdate: mockFindOneAndUpdate };
        }
        if (name === 'userPrefActivityLog') {
          return { insertOne: mockInsertOne };
        }
        return {};
      });
    });

    it('should update email and log activity', async () => {
      const mockResult = {
        uuid: '123',
        updatedBy: 'admin',
        userId: 'new@example.com',
        brandId: 'CM',
        regionId: 'NA'
      };

      mockFindOneAndUpdate.mockResolvedValue(mockResult);
      mockInsertOne.mockResolvedValue({});

      const result = await updateEmailPref('123', 'CM', 'NA', 'old@example.com', 'new@example.com');
      expect(result).toEqual(mockResult);
      // Wait for the async logging to finish
      await new Promise(process.nextTick);
      expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
        uuid: '123',
        updatedBy: 'admin',
        data: expect.objectContaining({
          userId: 'new@example.com',
          brandId: 'CM',
          regionId: 'NA'
        }),
        createdDate: expect.any(Number)
      }));
    });

    it('should return null if no document found', async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      const result = await updateEmailPref('123', 'CM', 'NA', 'old@example.com', 'new@example.com');
      expect(result).toBeNull();
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    it('should throw error on DB failure', async () => {
      mockFindOneAndUpdate.mockRejectedValue(new Error('DB error'));

      await expect(updateEmailPref('123', 'CM', 'NA', 'old@example.com', 'new@example.com'))
        .rejects.toThrow('DB error');
    });
  });
});