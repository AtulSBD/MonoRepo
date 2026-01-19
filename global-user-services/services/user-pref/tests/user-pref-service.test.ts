import { UserPrefService } from '../src/user-pref/user-pref-service';
import mongoose from 'mongoose';
import { sendDataToTD } from '../src/utils/td.service';
import { getUserFullData,  } from '../src/utils/shared';
import { mapPreferencesToFields } from '../src/utils/shared' ;

const service  = new UserPrefService();

jest.mock('mongoose', () => ({
  connection: {
    collection: jest.fn()
  }
}));

jest.mock('../src/utils/td.service', () => ({
  sendDataToTD: jest.fn()
}));

jest.mock('../src/utils/shared', () => ({
  getUserFullData: jest.fn(),
  mapPreferencesToFields: jest.fn()
}));



  describe('getPreferences', () => {
    it('should return preferences response when userPrefs found', async () => {
      const mockAggregate = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: 'id1',
            userId: 'user1',
            MUUID: 'muuid1',
            brandId: 'brand1',
            regionId: 'region1',
            marketId: 'market1',
            uuid: 'uuid1',
            productAggData: {
              uuid: 'uuid1',
              tool_usage: ['tool1'],
              company: 'company1',
              shop: ['shop1'],
              retailers: ['retailer1']
            },
            tool_usage: ['tool1'],
            myInterests: ['interest1'],
            jobRoleORFunction: ['role1'],
            demographicTrades: ['trade1']
          }
        ])
      });
      (mongoose.connection.collection as jest.Mock).mockResolvedValue({
        aggregate: mockAggregate
      });

      const result = await service.getPreferences('uuid1', 'brand1', 'region1', 'market1', 10, 0);

      expect(result).toHaveProperty('uuid', 'uuid1');
      expect(result).toHaveProperty('userMarketPrefrences');
      expect(result.userMarketPrefrences.length).toBe(1);
    });

    it('should throw error when no userPrefs found', async () => {
      const mockAggregate = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });
      (mongoose.connection.collection as jest.Mock).mockResolvedValue({
        aggregate: mockAggregate
      });

      await expect(
        service.getPreferences('uuid1', 'brand1', 'region1', 'market1', 10, 0)
      ).rejects.toThrow('Records not found with given details');
    });
  });

  describe('createOrUpdatePreference', () => {
    it('should create or update preference and log activity', async () => {
      const input = {
        userId: 'user1',
        brandId: 'brand1',
        regionId: 'region1',
        market: 'market1',
        uuid: 'uuid1',
        MUUID: 'muuid1',
        tool_usage: ['tool1'],
        source: 'source1',
        shop: ['shop1'],
        retailers: ['retailer1'],
        websiteMemberAccountType: 'type1',
        updatedBy: 'admin',
        locale: 'en',
        reqFromIdentityManagement: false
      };

      // Mock productAgg collection
      (mongoose.connection.collection as jest.Mock)
        .mockResolvedValueOnce({
          findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'aggid1' })
        })
        // Mock userPref collection
        .mockResolvedValueOnce({
          findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'prefid1' })
        })
        // Mock activity log collection
        .mockResolvedValueOnce({
          insertOne: jest.fn().mockResolvedValue({})
        });

      // Mock getUserFullData and mapPreferencesToFields
      (getUserFullData as jest.Mock).mockResolvedValue({ uuid: 'uuid1', brandId: 'brand1', regionId: 'region1' });
      (mapPreferencesToFields as jest.Mock).mockReturnValue({ mapped: true });

      const result = await service.createOrUpdatePreference(input as any);
      expect(sendDataToTD).toHaveBeenCalled();
    });

    it('should throw error if productAgg upsert fails', async () => {
      (mongoose.connection.collection as jest.Mock)
        .mockResolvedValueOnce({
          findOneAndUpdate: jest.fn().mockResolvedValue(null)
        });

      const input = {
        userId: 'user1',
        brandId: 'brand1',
        regionId: 'region1',
        market: 'market1',
        uuid: 'uuid1'
      };

      await expect(service.createOrUpdatePreference(input as any)).rejects.toThrow('Error in productAgg upsert:');
    });
  });

  describe('formatDateToDDMMYYYY', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-06-01T00:00:00Z');
      const result = service.formatDateToDDMMYYYY(date);
      expect(result).toBe('06/01/2024');
    });
  });

  describe('deletePreference', () => {
    it('should return true if preference is deleted', async () => {
      (mongoose.connection.collection as jest.Mock).mockResolvedValue({
        findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'id1' })
      });

      const result = await service.deletePreference('uuid1', 'brand1', 'region1', 'market1');
      expect(result).toBe(true);
    });

    it('should return false if preference is not found', async () => {
      (mongoose.connection.collection as jest.Mock).mockResolvedValue({
        findOneAndUpdate: jest.fn().mockResolvedValue(null)
      });

      const result = await service.deletePreference('uuid1', 'brand1', 'region1', 'market1');
      expect(result).toBe(false);
    });
  });

  describe('permanentDeleteUserData', () => {
    it('should return true if user data is deleted', async () => {
      (mongoose.connection.collection as jest.Mock).mockResolvedValue({
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
      });

      const result = await service.permanentDeleteUserData('uuid1', 'market1');
      expect(result).toBe(true);
    });

    it('should throw error if no user data found', async () => {
      (mongoose.connection.collection as jest.Mock).mockResolvedValue({
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
      });

      await expect(service.permanentDeleteUserData('uuid1', 'market1')).rejects.toThrow('No user data found for UUID: uuid1');
    });

    it('should throw error if deleteMany throws', async () => {
      (mongoose.connection.collection as jest.Mock).mockResolvedValue({
        deleteMany: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      await expect(service.permanentDeleteUserData('uuid1', 'market1')).rejects.toThrow('Error deleting user data: Error: DB error');
    });
  });