import axios from 'axios';
import * as config from '../src/env';
import { getConfig } from '../src/services/config.service';
import { handleApiError } from '../src/Utils/errorHandler';
import { validateBrandAndRegion } from '../src/Utils/shared';
import UserPII from '../src/models/UserPII.model';
import { userService, getuserData } from '../src/services/user.service'; // Adjust path

jest.mock('axios');
jest.mock('../src/env', () => ({
  baseURL: 'https://mocked-api.com'
}));
jest.mock('../src/services/config.service');
jest.mock('../src/Utils/errorHandler');
jest.mock('../src/Utils/shared');
jest.mock('../src/models/UserPII.model');
jest.mock('../src/Utils/responseWrapper');


describe('userService', () => {
  const mockUserData = {
    email: 'test@example.com',
    givenName: 'Test',
    familyName: 'User'
  };

  const mockConfig = {
    clientId: 'client123',
    flow: 'flow1',
    flowVersion: 'v1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getConfig as jest.Mock).mockReturnValue(mockConfig);
    (UserPII as jest.Mock).mockImplementation((data) => data);
  });

  it('should send filtered user data and return success response', async () => {
    const mockResponse = { data: { stat: 'ok', result: 'updated' } };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await userService(
      {
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
        phone: '', // should be filtered out
        country: null // should be filtered out
      },
      'uuid123',
      'CM',
      'NA',
      'token123',
      'en-US'
    );

    expect(validateBrandAndRegion).toHaveBeenCalledWith({ brand: 'CM', region: 'NA' });

    // Ensure filtered fields are not present
    const calledBody = (axios.post as jest.Mock).mock.calls[0][1];
    expect(calledBody).not.toHaveProperty('phone');
    expect(calledBody).not.toHaveProperty('country');

    expect(result).toEqual({ stat: 'ok', result: 'updated' });
  });

  it('should handle API error response (stat=error) and return errorCode', async () => {
    const mockResponse = { data: { stat: 'error', code: 200 } };
    const mockError = { errorCode: 400, message: 'API error' };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);
    (handleApiError as jest.Mock).mockReturnValue(mockError);

    const result = await userService(mockUserData, 'uuid123', 'CM', 'NA', 'token123', 'en-US');
    expect(result).toEqual(mockError);
  });

  it('should throw error on exception', async () => {
    const thrownError = new Error('Unexpected error');
    (axios.post as jest.Mock).mockRejectedValue(thrownError);
    (handleApiError as jest.Mock).mockImplementation(({ error }) => error);

    await expect(userService(mockUserData, 'uuid123', 'CM', 'NA', 'token123', 'en-US')).rejects.toThrow('Unexpected error');
  });

  it('should throw error if validateBrandAndRegion fails', async () => {
    const thrownError = new Error('Invalid brand/region');
    (validateBrandAndRegion as jest.Mock).mockImplementation(() => {
      throw thrownError;
    });
    (handleApiError as jest.Mock).mockImplementation(({ error }) => error);

    await expect(
      userService(mockUserData, 'uuid123', 'INVALID', 'INVALID', 'token123', 'en-US')
    ).rejects.toThrow('Invalid brand/region');
  });
});

describe('getuserData', () => {
  const mockConfig = {
    ownerId: 'owner123',
    ownerSecret: 'secret123',
    entity: 'User'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getConfig as jest.Mock).mockReturnValue(mockConfig);
  });

  it('should fetch user data and return result (stat=ok)', async () => {
    const mockResponse = {
      data: {
        stat: 'ok',
        result: { email: 'test@example.com' }
      }
    };
    (axios.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await getuserData('uuid123', 'CM', 'NA','locale');
    expect(axios.get).toHaveBeenCalledWith(
      'https://mocked-api.com/entity',
      expect.objectContaining({
        params: {
          uuid: 'uuid123',
          type_name: 'User',
          attributes: '["email", "givenName", "familyName"]'
        },
        auth: {
          username: 'owner123',
          password: 'secret123'
        }
      })
    );
    expect(result).toEqual({ email: 'test@example.com' });
  });

  it('should handle API stat error and return undefined', async () => {
    const mockResponse = {
      data: {
        stat: 'error',
        code: 200
      }
    };
    const mockError = { errorCode: 400, message: 'Fetch error' };
    (axios.get as jest.Mock).mockResolvedValue(mockResponse);
    (handleApiError as jest.Mock).mockReturnValue(mockError);

    const result = await getuserData('uuid123', 'CM', 'NA','locale');
    expect(result).toBeUndefined();
  });

  it('should throw error on exception', async () => {
    const thrownError = new Error('Network error');
    (axios.get as jest.Mock).mockRejectedValue(thrownError);

    await expect(getuserData('uuid123', 'CM', 'NA','locale')).rejects.toThrow('Network error');
  });
});
