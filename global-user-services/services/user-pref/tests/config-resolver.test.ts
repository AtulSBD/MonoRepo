import { configResolvers } from '../src/config/config-resolver';
import { ConfigService } from '../src/config/config-service';
import { ApolloError } from 'apollo-server-express';

jest.mock('../src/env', () => ({
  mongoUri: 'mongodb://localhost:27017/test',
}));
jest.mock('../src/config/config-service');

describe('configResolvers', () => {
  const mockConfigs = [
    {
      configId: '1',
      appId: 'app1',
      brandId: 'CM',
      regionId: 'NA',
      env: 'dev',
      locale: 'en-US',
      marketId: 'US',
      settings: [{ k: 'website', v: 'example.com' }],
      desc: '',
    },
    {
      configId: '2',
      appId: 'app2',
      brandId: 'DW',
      regionId: 'EMEA',
      env: 'prod',
      locale: 'en-GB',
      marketId: 'UK',
      settings: [{ k: 'website', v: 'example2.com' }],
      desc: '',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.configs', () => {
    it('should return paginated configs with filters', async () => {
      (ConfigService as jest.Mock).mockImplementation(() => ({
        getConfig: jest.fn().mockResolvedValue(mockConfigs),
      }));

      const args = { pgIndex: 1, pgSize: 1, appId: 'app1' };
      const result = await configResolvers.Query.configs({}, args);

      expect(result).toEqual([mockConfigs[0]]);
    });

    it('should apply default pagination if not provided', async () => {
      (ConfigService as jest.Mock).mockImplementation(() => ({
        getConfig: jest.fn().mockResolvedValue(mockConfigs),
      }));

      const result = await configResolvers.Query.configs({}, {});
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Mutation.createOrUpdateConfig', () => {
    it('should create or update config when input is valid', async () => {
      const input = [mockConfigs[0]];
      (ConfigService as jest.Mock).mockImplementation(() => ({
        createOrUpdateConfig: jest.fn().mockResolvedValue('success'),
      }));

      const result = await configResolvers.Mutation.createOrUpdateConfig({}, { input });
      expect(result).toBe('success');
    });

    it('should throw ApolloError for missing required fields', async () => {
      const invalidInput = [
        {
          configId: '',
          appId: '',
          brandId: '',
          regionId: '',
          env: '',
          locale: '',
          marketId: '',
          settings: [],
          desc: '',
        },
      ];

      await expect(
        configResolvers.Mutation.createOrUpdateConfig({}, { input: invalidInput })
      ).rejects.toThrow(ApolloError);
    });

    it('should validate AIC-specific fields (locale and marketId)', async () => {
      const invalidInput = [
        {
          configId: '3',
          appId: 'AIC',
          brandId: 'BR',
          regionId: 'NA',
          env: 'dev',
          locale: '',
          marketId: '',
          settings: [{ k: 'key', v: 'val' }],
          desc: '',
        },
      ];

      await expect(
        configResolvers.Mutation.createOrUpdateConfig({}, { input: invalidInput })
      ).rejects.toThrow(/locale is required.*marketId is required/);
    });

    it('should validate multiple configs and report all errors', async () => {
      const invalidInput = [
        {
          configId: '',
          appId: '',
          brandId: '',
          regionId: '',
          env: '',
          locale: '',
          marketId: '',
          settings: [],
          desc: '',
        },
        {
          configId: 'valid',
          appId: 'AIC',
          brandId: '',
          regionId: '',
          env: '',
          locale: '',
          marketId: '',
          settings: [],
          desc: '',
        },
      ];

      await expect(
        configResolvers.Mutation.createOrUpdateConfig({}, { input: invalidInput })
      ).rejects.toThrow(/Validation errors:/);
    });
  });
});
