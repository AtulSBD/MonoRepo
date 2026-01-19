
import { userPrefResolvers } from '../src/user-pref/user-pref-resolver';
import { UserPrefService } from '../src/user-pref/user-pref-service';
import { ApolloError } from 'apollo-server-express';
import { sendLogToNewRelic } from '../newRelicLogger';


jest.mock('../src/env', () => ({
  mongoUri: 'mongodb://localhost:27017/test',
}));

jest.mock('../src/user-pref/user-pref-service');
jest.mock('../newRelicLogger');
jest.mock('../src/utils/shared');

describe('userPrefResolvers', () => {
  const mockPref = {
    userId: "sample-email@mail.com",
    MUUID: 'muuid-userid',
    brandId: 'BR1',
    regionId: 'RG1',
    updatedBy: 'admin',
    market: 'US',
    locale: 'en-US',
    sms: true,
    smsDate: '01/01/2023',
    advertisingConsent: true,
    advertisingConsentDate: '01/01/2023'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.userPrefs', () => {
    it('should throw error if uuid is missing', async () => {
      await expect(userPrefResolvers.Query.userPrefs({}, { uuid: '', brandId: 'BR1', regionId: 'RG1' }))
        .rejects.toThrow('uuid is required');
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });

    it('should throw error if brandId is missing', async () => {
      await expect(userPrefResolvers.Query.userPrefs({}, { uuid: 'uuid', brandId: '', regionId: 'RG1' }))
        .rejects.toThrow('brandId is required');
    });

    it('should throw error if regionId is missing', async () => {
      await expect(userPrefResolvers.Query.userPrefs({}, { uuid: 'uuid', brandId: 'BR1', regionId: '' }))
        .rejects.toThrow('regionId is required');
    });

    it('should return preferences and log success', async () => {
      const mockPrefs = [{ id: 1 }];
      (UserPrefService as jest.Mock).mockImplementation(() => ({
        getPreferences: jest.fn().mockResolvedValue(mockPrefs)
      }));

      const result = await userPrefResolvers.Query.userPrefs({}, {
        uuid: 'uuid',
        brandId: 'BR1',
        regionId: 'RG1',
        pgSize: 10,
        pgIndex: 1
      });

      expect(result).toEqual(mockPrefs);
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });
  });

  describe('Mutation.createOrUpdateUserPref', () => {
    it('should throw error if user id is missing', async () => {
      await expect(userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input: { ...mockPref, userId: '' } }))
        .rejects.toThrow(ApolloError);
    });

    it('should throw error if brandId is missing', async () => {
      await expect(userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input: { ...mockPref, brandId: '' } }))
        .rejects.toThrow(ApolloError);
    });

    it('should throw error if regionId is missing', async () => {
      await expect(userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input: { ...mockPref, regionId: '' } }))
        .rejects.toThrow(ApolloError);
    });

    it('should throw error if updatedBy is missing', async () => {
      await expect(userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input: { ...mockPref, updatedBy: '' } }))
        .rejects.toThrow(ApolloError);
    });

    it('should throw error if smsDate is invalid', async () => {
      await expect(userPrefResolvers.Mutation.createOrUpdateUserPref({}, {
        input: { ...mockPref, smsDate: 'invalid-date' }
      })).rejects.toThrow(ApolloError);
    });

    it('should throw error if advertisingConsentDate is invalid', async () => {
      await expect(userPrefResolvers.Mutation.createOrUpdateUserPref({}, {
        input: { ...mockPref, advertisingConsentDate: 'invalid-date' }
      })).rejects.toThrow(ApolloError);
    });

    it('should create preference and log success', async () => {
      (UserPrefService as jest.Mock).mockImplementation(() => ({
        createOrUpdatePreference: jest.fn().mockResolvedValue('success'),
        formatDateToDDMMYYYY: jest.fn().mockReturnValue('01/01/2023')
      }));

      const result = await userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input: mockPref });
      expect(result).toBe('success');
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });

    it('should throw error if sms is not a boolean', async () => {
      const input = { ...mockPref, sms: 'yes' }; // invalid sms value

      await expect(
        userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input })
      ).rejects.toThrow("sms field must be a valid boolean value: either true or false");
    });

    it('should default advertisingConsent to false and set advertisingConsentDate if not boolean', async () => {
      const input = { ...mockPref, advertisingConsent: 'yes' as any };

      (UserPrefService as jest.Mock).mockImplementation(() => ({
        createOrUpdatePreference: jest.fn().mockResolvedValue('success'),
        formatDateToDDMMYYYY: jest.fn().mockReturnValue('01/01/2023'),
      }));

      const result = await userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input });
      expect(result).toBe('success');
    });

    it('should throw error if smsDate is invalid after preference creation', async () => {
      const input = { ...mockPref, smsDate: 'invalid-date' };

      (UserPrefService as jest.Mock).mockImplementation(() => ({
        createOrUpdatePreference: jest.fn().mockResolvedValue('success'),
        formatDateToDDMMYYYY: jest.fn().mockReturnValue('01/01/2023'),
      }));

      await expect(
        userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input })
      ).rejects.toThrow('Please send the valid sms date. Date format should be mm/dd/yyyy ');
    });

    it('should call validateBrandAndRegion with correct input', async () => {
      const validateSpy = jest.spyOn(require('../src/utils/shared'), 'validateBrandAndRegion');

      (UserPrefService as jest.Mock).mockImplementation(() => ({
        createOrUpdatePreference: jest.fn().mockResolvedValue('success'),
        formatDateToDDMMYYYY: jest.fn().mockReturnValue('01/01/2023'),
      }));

      const result = await userPrefResolvers.Mutation.createOrUpdateUserPref({}, { input: mockPref });
      expect(result).toBe('success');
      expect(validateSpy).toHaveBeenCalledWith(mockPref);
    });

  });

  describe('Mutation.permanentDeleteUserData', () => {
    it('should throw error if uuid is missing', async () => {
      await expect(userPrefResolvers.Mutation.permanentDeleteUserData({}, { uuid: '', market: 'US' }))
        .rejects.toThrow(ApolloError);
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });

    it('should throw error if deletion fails', async () => {
      (UserPrefService as jest.Mock).mockImplementation(() => ({
        permanentDeleteUserData: jest.fn().mockResolvedValue(false)
      }));

      await expect(userPrefResolvers.Mutation.permanentDeleteUserData({}, { uuid: 'uuid', market: 'US' }))
        .rejects.toThrow(ApolloError);
    });

    it('should delete user data and log success', async () => {
      (UserPrefService as jest.Mock).mockImplementation(() => ({
        permanentDeleteUserData: jest.fn().mockResolvedValue(true)
      }));

      const result = await userPrefResolvers.Mutation.permanentDeleteUserData({}, { uuid: 'uuid', market: 'US' });
      expect(result).toBe('User with uuid: uuid permanently deleted from database');
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });
  });
});
