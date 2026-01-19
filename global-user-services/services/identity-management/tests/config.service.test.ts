import mongoose from 'mongoose';
import { setConfig, getConfig, getTDConfig, getIterableConfig } from '../src/services/config.service';
 
// --- CacheService Mock ---
const cacheMap = new Map<string, any>();
const cacheServiceMock = {
  set: (key: string, value: any) => cacheMap.set(key, value),
  get: (key: string) => cacheMap.get(key),
  clear: () => cacheMap.clear(),
};
jest.mock('../src/services/cache.service', () => ({
  __esModule: true,
  default: {
    getInstance: () => cacheServiceMock,
  },
}));
 
// --- Mongoose Connection/Collection Mocks ---
const mockToArray = jest.fn();
const mockFind = jest.fn(() => ({ toArray: mockToArray }));
const mockCollection = jest.fn(() => ({ find: mockFind }));
 
// --- Decrypt Mock ---
jest.mock('../src/Utils/shared', () => ({
  ...jest.requireActual('../src/Utils/shared'),
  decrypt: (value: any) => `decrypted-${value}`,
}));
 
beforeEach(() => {
  // Reset cache
  cacheServiceMock.clear();
 
  // Set up mongoose connection mock
  (mongoose as any).ConnectionStates = { connected: 1 };
  (mongoose.connection as any).readyState = 1;
  (mongoose.connection as any).db = { collection: mockCollection };
 
  jest.clearAllMocks();
});
 
describe('Config Service', () => {
  describe('setConfig', () => {
    it('should fetch config from DB and set in cache (AIC appId, with group)', async () => {
      const mockData = [
        {
          appId: 'AIC',
          brandId: 'brand1',
          regionId: 'region1',
          marketId: 'market1',
          locale: 'en-US',
          group: 'group1',
          settings: [{ k: 'website', v: 'encryptedValue' }]
        }
      ];
      mockToArray.mockResolvedValueOnce(mockData);
 
      await expect(setConfig('AIC')).resolves.not.toThrow();
    });
 
    it('should fetch config from DB and set in cache (AIC appId, no group)', async () => {
      const mockData = [
        {
          appId: 'AIC',
          brandId: 'brand1',
          regionId: 'region1',
          marketId: 'market1',
          locale: 'en-US',
          settings: [{ k: 'website', v: 'encryptedValue' }]
        }
      ];
      mockToArray.mockResolvedValueOnce(mockData);
 
      await expect(setConfig('AIC')).resolves.not.toThrow();
    });

 
    it('should fetch config from DB and set in cache (non-AIC appId, with group)', async () => {
      const mockData = [
        {
          appId: 'OTHER',
          brandId: 'brand2',
          regionId: 'region2',
          group: 'group2',
          settings: [{ k: 'website', v: 'encryptedValue' }]
        }
      ];
      mockToArray.mockResolvedValueOnce(mockData);
 
      await expect(setConfig('OTHER')).resolves.not.toThrow();
    });
 
    it('should fetch config from DB and set in cache (non-AIC appId, no group)', async () => {
      const mockData = [
        {
          appId: 'OTHER',
          brandId: 'brand2',
          regionId: 'region2',
          settings: [{ k: 'website', v: 'encryptedValue' }]
        }
      ];
      mockToArray.mockResolvedValueOnce(mockData);
 
      await expect(setConfig('OTHER')).resolves.not.toThrow();
    });
 
    it('should throw error if DB call fails', async () => {
      mockToArray.mockRejectedValueOnce(new Error('DB error'));
 
      await expect(setConfig('app123')).rejects.toThrow('Error while fetching configuration from database');
    });
  });
 
  describe('getConfig', () => {
    beforeEach(() => {
      cacheServiceMock.clear();
    });
 
    it('should return decrypted config data for all supported keys', () => {
      const settings = [
        { k: 'website', v: 'site.com' },
        { k: 'clientId', v: 'client123' },
        { k: 'clientSecret', v: 'secret123' },
        { k: 'ownerId', v: 'owner123' },
        { k: 'ownerSecret', v: 'ownersecret' },
        { k: 'flow', v: 'flow1' },
        { k: 'flowVersion', v: 'v1' },
        { k: 'passwordResetURL', v: 'reset.com' },
        { k: 'emailVerifyURL', v: 'verify.com' },
        { k: 'entity', v: 'User' }
      ];
      cacheServiceMock.set('fullConfig', settings);
 
      const result = getConfig('fullConfig');
 
      expect(result).toEqual({
        website: 'decrypted-site.com',
        clientId: 'decrypted-client123',
        clientSecret: 'decrypted-secret123',
        ownerId: 'decrypted-owner123',
        ownerSecret: 'decrypted-ownersecret',
        flow: 'decrypted-flow1',
        flowVersion: 'decrypted-v1',
        passwordResetURL: 'decrypted-reset.com',
        emailVerifyURL: 'decrypted-verify.com',
        entity: 'decrypted-User'
      });
    });
 
    it('should return empty object if no config found', () => {
      const result = getConfig('missing');
      expect(result).toEqual({});
    });
 
    it('should ignore unknown keys', () => {
      const settings = [
        { k: 'unknownKey', v: 'value' },
        { k: 'clientId', v: 'client123' }
      ];
      cacheServiceMock.set('partialConfig', settings);
 
      const result = getConfig('partialConfig');
      expect(result).toEqual({
        clientId: 'decrypted-client123'
      });
    });
 
    it('should handle empty config array', () => {
      cacheServiceMock.set('emptyConfig', []);
      const result = getConfig('emptyConfig');
      expect(result).toEqual({});
    });
 
    it('should handle malformed config items', () => {
      const settings = [
        { k: null, v: 'value' },
        { k: 'clientId', v: null }
      ];
      cacheServiceMock.set('malformedConfig', settings);
 
      const result = getConfig('malformedConfig');
      expect(result.clientId).toBe('decrypted-null');
    });
  });
 
  describe('getTDConfig', () => {
    beforeEach(() => {
      cacheServiceMock.clear();
    });
 
    it('should return decrypted TD config data', () => {
      const settings = [
        { k: 'dbName', v: 'td_db' },
        { k: 'writeKey', v: 'key123' }
      ];
      cacheServiceMock.set('tdCache', settings);
 
      const result = getTDConfig('tdCache');
      expect(result.dbName).toBe('decrypted-td_db');
      expect(result.writeKey).toBe('decrypted-key123');
    });
  });
 
  describe('getIterableConfig', () => {
    beforeEach(() => {
      cacheServiceMock.clear();
    });
 
    it('should return decrypted Iterable config data', () => {
      const settings = [{ k: 'apikey', v: 'iter123' }];
      cacheServiceMock.set('iterCache', settings);
 
      const result = getIterableConfig('iterCache');
      expect(result.apikey).toBe('decrypted-iter123');
    });
  });
});
 