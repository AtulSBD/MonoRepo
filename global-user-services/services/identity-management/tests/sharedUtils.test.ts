// --- Mocks ---
jest.mock('axios');
jest.mock('../src/services/config.service');
jest.mock('../src/models/UserResponse.model', () => {
  return jest.fn().mockImplementation((data) => data);
});
jest.mock('../src/models/UserMuuid.model', () => ({
  Market: {
    findOne: jest.fn(),
  },
  Region: {
    findOne: jest.fn(),
  }
}));

// --- Set up environment variables before imports ---
process.env.AES_IV = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
process.env.AES_SECRET = 'test-master-key';

// --- Imports ---
import {
  validatePassword,
  validateConfirmPassword,
  validateEmail,
  validateRequiredField,
  validateBrandAndRegion,
  formatDateToTD,
  encrypt,
  decrypt,
  convertGraphQLErrorToPlainString,
  fetchUserDetailsFromAicApi,
  getUserDetailsFromAIC,
  normalizeAICUser
} from '../src/Utils/shared';
import axios from 'axios';
import { getConfig } from '../src/services/config.service';
import UserResponse from '../src/models/UserResponse.model';
import * as configService from '../src/services/config.service';
import * as UserMuuidModel from '../src/models/UserMuuid.model';

// --- DB Mocks for validateBrandAndRegion ---
const mockBrandFindOne = jest.fn();

import { Region, Market } from '../src/models/UserMuuid.model';
const mockMarketFindOne = jest.fn();
const mockRegionFindOne = jest.fn();
(Market.findOne as jest.Mock) = mockMarketFindOne;
(Region.findOne as jest.Mock) = mockRegionFindOne;

const mockDb = {
  collection: (name: string) => {
    if (name === 'region') {
      return { findOne: mockRegionFindOne };
    }
    if (name === 'brand') {
      return { findOne: mockBrandFindOne };
    }
    throw new Error(`Unknown collection: ${name}`);
  }
};



// For valid region
mockRegionFindOne.mockReturnValue({
  lean: () => Promise.resolve({ _id: 'NA' })
});

// For invalid region
mockRegionFindOne.mockReturnValue({
  lean: () => Promise.resolve(null)
});

jest.mock('../src/config/db', () => ({
  connectDB: jest.fn()
}));

beforeEach(() => {
  (UserMuuidModel.Market.findOne as jest.Mock).mockImplementation(() => ({
    lean: () => Promise.resolve({ _id: 'US' }),
  }));
  (require('../src/config/db').connectDB as jest.Mock).mockResolvedValue(mockDb);
  mockRegionFindOne.mockReset();
  mockBrandFindOne.mockReset();
  jest.clearAllMocks();
});

describe('Validation Utilities', () => {
  describe('validatePassword', () => {
    it('should throw error if password contains the word "password"', () => {
      expect(() => validatePassword('Password123!')).toThrow(
        "Password must not contain the word 'password' or its variations."
      );
    });

    it('should throw error if password does not meet complexity requirements', () => {
      expect(() => validatePassword('simple123')).toThrow(
        "Password must be at least 8 characters long, contain at least one special character, one uppercase letter, one lowercase letter, and one numeric value."
      );
    });

    it('should pass for a valid password', () => {
      expect(() => validatePassword('Valid@123')).not.toThrow();
    });
  });

  describe('validateConfirmPassword', () => {
    it('should throw error if passwords do not match', () => {
      expect(() => validateConfirmPassword('Valid@123', 'Invalid@123')).toThrow(
        'Confirm password does not match'
      );
    });

    it('should pass if passwords match', () => {
      expect(() => validateConfirmPassword('Valid@123', 'Valid@123')).not.toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should throw error for invalid email format', () => {
      expect(() => validateEmail('invalid-email')).toThrow('Invalid email address');
    });

    it('should pass for valid email format', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
    });
  });

  describe('validateRequiredField', () => {
    const baseUser = {
      region: 'NA',
      brand: 'DW',
      market: 'US',
      givenName: 'John',
      familyName: 'Doe',
      emailAddress: 'john@example.com',
    };

    it('should throw error if required fields are missing', () => {
      expect(() => validateRequiredField({} as any)).toThrowErrorMatchingSnapshot();
    });

    it('should throw error if optInNewsletters/emailConsent is missing for non-gated', () => {
      expect(() =>
        validateRequiredField(baseUser as any, false)
      ).toThrow('Mandatory fields are missing: optInNewsletters/emailConsent');
    });

    it('should pass if all required fields are present', () => {
      const user = {
        ...baseUser,
        optInNewsletters: true,
        emailConsent: true,
      };
      expect(() => validateRequiredField(user as any, false)).not.toThrow();
    });
  });

  // --- UPDATED: validateBrandAndRegion tests ---
  describe('validateBrandAndRegion', () => {
  it('should throw error if brand or region is missing', async () => {
    mockRegionFindOne.mockReturnValue({
      lean: () => Promise.resolve(null)
    });
    await expect(validateBrandAndRegion({})).rejects.toThrow(
      'Please provide the brandId and regionId'
    );
  });

  it('should throw error for invalid brand', async () => {
    mockRegionFindOne.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'NA' })
    });
    mockBrandFindOne.mockResolvedValue(null);

    await expect(validateBrandAndRegion({ brand: 'XX', region: 'NA' })).rejects.toThrow(
      'Invalid brand ID'
    );
  });

  it('should throw error for invalid region', async () => {
    mockRegionFindOne.mockReturnValue({
      lean: () => Promise.resolve(null)
    });
    mockBrandFindOne.mockResolvedValue({ _id: 'DW' });

    await expect(validateBrandAndRegion({ brand: 'DW', region: 'EU' })).rejects.toThrow(
      'Invalid region ID'
    );
  });

  it('should pass for valid brand and region', async () => {
    mockRegionFindOne.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'NA' })
    });
    mockBrandFindOne.mockResolvedValue({ _id: 'DW' });

    await expect(validateBrandAndRegion({ brand: 'DW', region: 'NA' })).resolves.not.toThrow();
  });
});

  describe('formatDateToTD', () => {
    it('should format date to YYYY-MM-DD HH:mm:ss', () => {
      const date = new Date(Date.UTC(2023, 0, 1, 10, 5, 30)); // Jan 1, 2023, 10:05:30 UTC
      const result = formatDateToTD(date);
      expect(result).toBe('2023-01-01 10:05:30');
    });
  });

  describe('convertGraphQLErrorToPlainString', () => {
    it('should convert GraphQL error to plain string', () => {
      const error = 'Variable "$email" got invalid value "abc"; Expected type Email.';
      const result = convertGraphQLErrorToPlainString(error);
      expect(result).toBe(
        'Invalid value "abc" provided for $email. Reason: Expected type Email.'
      );
    });

    it('should return generic message if format does not match', () => {
      const error = 'Some unexpected error';
      const result = convertGraphQLErrorToPlainString(error);
      expect(result).toBe('An error occurred while processing your request.');
    });
  });

  describe('encrypt and decrypt', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      jest.resetAllMocks();
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should encrypt and decrypt a string correctly', async () => {
      const text = 'SensitiveData123!';
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(text);
    });

    it('should throw error for invalid encrypted string', () => {
      expect(() => decrypt(undefined as any)).toThrow(
        'Invalid encrypted string format: undefined'
      );
    });
  });



  jest.mock('axios');
  jest.mock('../src/services/config.service');
  jest.mock('../src/models/UserResponse.model', () => {
    return jest.fn().mockImplementation((data) => data);
  });

  describe('getUserDetailsFromAIC', () => {
    const mockConfig = {
      ownerId: 'testOwner',
      ownerSecret: 'testSecret',
      entity: 'testEntity',
      baseURL: 'http://mock-aic.com'
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (getConfig as jest.Mock).mockReturnValue(mockConfig);
    });

    it('should return userpi, createdDate, and lastLogin on success', async () => {
      const mockResult = {
        email: 'test@example.com',
        created: '2023-01-01T00:00:00Z',
        lastLogin: '2023-01-02T00:00:00Z'
      };
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stat: 'ok',
          result: mockResult
        }
      });
      (UserResponse as jest.Mock).mockImplementation((data) => data);

      const result = await getUserDetailsFromAIC('uuid123', 'DW', 'NA', 'en-US');
      expect(UserResponse).toHaveBeenCalledWith(mockResult);
      expect(result).toEqual({
        userpi: mockResult,
        createdDate: '2023-01-01T00:00:00Z',
        lastLogin: '2023-01-02T00:00:00Z'
      });
    });

    it('should return null if AIC returns error stat', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stat: 'error',
          message: 'Invalid UUID'
        }
      });

      const result = await getUserDetailsFromAIC('uuid123', 'DW', 'NA', 'en-US');
      expect(result).toBeNull();
    });

    it('should return null if axios throws', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await getUserDetailsFromAIC('uuid123', 'DW', 'NA', 'en-US');
      expect(result).toBeNull();
    });

    it('should call getConfig with correct params', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stat: 'ok',
          result: { email: 'test@example.com' }
        }
      });
      await getUserDetailsFromAIC('uuid123', 'DW', 'NA', 'en-US');
      expect(getConfig).toHaveBeenCalledWith('AIC_DW_NA_US_en-US');
    });

    
  });

  describe('fetchUserDetailsFromAicApi', () => {
    const mockConfig = {
      ownerId: 'owner-id',
      ownerSecret: 'owner-secret',
      entity: 'userEntity',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (configService.getConfig as jest.Mock).mockReturnValue(mockConfig);
    });

    it('should return user data on success', async () => {
      const mockResponse = {
        data: {
          stat: 'ok',
          result: {
            givenName: 'John',
            familyName: 'Doe',
          },
        },
      };
      (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchUserDetailsFromAicApi('uuid', 'DW', 'NA', 'en-US');
      expect(result).toEqual(mockResponse.data.result);
    });

    it('should throw error on API stat error', async () => {
      const mockErrorResponse = {
        data: {
          stat: 'error',
          code: 200,
        },
      };
      (axios.get as jest.Mock).mockResolvedValueOnce(mockErrorResponse);

      await expect(fetchUserDetailsFromAicApi('uuid', 'DW', 'NA', 'en-US')).rejects.toThrow('Failed to fetch user data');
    });

    it('should throw error on network failure', async () => {
      const networkError = new Error('Network error');
      (axios.get as jest.Mock).mockRejectedValueOnce(networkError);

      await expect(fetchUserDetailsFromAicApi('uuid', 'DW', 'NA', 'en-US')).rejects.toThrow('Network error');
    });
  });
});

describe('getUserDetailsFromAIC', () => {
  const mockConfig = {
    ownerId: 'testOwner',
    ownerSecret: 'testSecret',
    entity: 'testEntity'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (UserMuuidModel.Market.findOne as jest.Mock).mockImplementation(() => ({
      lean: () => Promise.resolve({ _id: 'US' }),
    }));
  });

  it('should return user response on success', async () => {
    (getConfig as jest.Mock).mockReturnValue(mockConfig);
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        stat: 'ok',
        result: { email: 'test@example.com' }
      }
    });
    (UserResponse as jest.Mock).mockImplementation((data) => data);

    const result = await getUserDetailsFromAIC('uuid123', 'brandX', 'regionY', 'en-US');
    expect(UserResponse).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(result?.userpi).toEqual({ email: 'test@example.com' });
  });

  it('should return null on AIC error response', async () => {
    (getConfig as jest.Mock).mockReturnValue(mockConfig);
    (axios.get as jest.Mock).mockResolvedValue({
      data: { stat: 'error', message: 'Invalid UUID' }
    });

    const result = await getUserDetailsFromAIC('uuid123', 'brandX', 'regionY', 'en-US');
    expect(result).toBeNull();
  });

  it('should return null on exception', async () => {
    (getConfig as jest.Mock).mockReturnValue(mockConfig);
    (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await getUserDetailsFromAIC('uuid123', 'brandX', 'regionY', 'en-US');
    expect(result).toBeNull();
  });
});


describe('normalizeAICUser', () => {
  it('should map firstName and lastName to givenName and familyName and keep other fields', () => {
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      age: 30,
      address: '123 Main St'
    };

    const result = normalizeAICUser(input);

    expect(result).toEqual({
      givenName: 'John',
      familyName: 'Doe',
      email: 'john.doe@example.com',
      age: 30,
      address: '123 Main St'
    });
  });

  it('should handle missing firstName/lastName', () => {
    const input = {
      email: 'jane@example.com',
      age: 25
    };

    const result = normalizeAICUser(input);

    expect(result).toEqual({
      givenName: undefined,
      familyName: undefined,
      email: 'jane@example.com',
      age: 25
    });
  });

  it('should return empty object for undefined input', () => {
    expect(normalizeAICUser(undefined)).toEqual({});
  });

  it('should return empty object for null input', () => {
    expect(normalizeAICUser(null)).toEqual({});
  });
});
