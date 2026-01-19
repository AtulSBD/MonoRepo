import axios from 'axios';
import * as config from '../src/env';
import { getMarket, getBrand, getRegion } from '../src/services/lookup.service'; // Adjust path

jest.mock('axios');
jest.mock('../src/env', () => ({
  graphqlURLGPR: 'https://mocked-graphql-url.com'
}));

describe('GraphQL Config Queries', () => {
  const mockAgent = { httpsAgent: expect.any(Object) };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMarket', () => {
    it('should return true if market ID matches', async () => {
      const mockResponse = {
        data: {
          data: {
            getMarkets: [
              { _id: 'US', name: 'United States', regionId: 'NA', languages: ['en'] }
            ]
          }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getMarket('us');
      expect(result.isExits).toBe(true);
    });

    it('should return false if market ID does not match', async () => {
      const mockResponse = {
        data: {
          data: {
            getMarkets: [
              { _id: 'CA', name: 'Canada', regionId: 'NA', languages: ['en'] }
            ]
          }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getMarket('us');
      expect(result.isExits).toBe(false);
    });

    it('should throw error on request failure', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(getMarket('us')).rejects.toThrow('Network error');
    });
  });

  describe('getBrand', () => {
    it('should return true if brand ID matches', async () => {
      const mockResponse = {
        data: {
          brands: [
            { _id: 'CM', name: 'Craftsman' }
          ]
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getBrand('CM');
      expect(result).toBe(true);
    });

    it('should return false if brand ID does not match', async () => {
      const mockResponse = {
        data: {
          brands: [
            { _id: 'ST', name: 'Stanley' }
          ]
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getBrand('CM');
      expect(result).toBe(false);
    });

    it('should throw error on request failure', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('GraphQL error'));

      await expect(getBrand('CM')).rejects.toThrow('GraphQL error');
    });
  });

  describe('getRegion', () => {
    it('should return true if region ID matches', async () => {
      const mockResponse = {
        data: {
          regions: [
            { _id: 'NA', name: 'North America', allowCrossMarketReg: true, allowToDashboard: true }
          ]
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getRegion('NA');
      expect(result).toBe(true);
    });

    it('should return false if region ID does not match', async () => {
      const mockResponse = {
        data: {
          regions: [
            { _id: 'EU', name: 'Europe', allowCrossMarketReg: true, allowToDashboard: true }
          ]
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getRegion('NA');
      expect(result).toBe(false);
    });

    it('should throw error on request failure', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Request failed'));

      await expect(getRegion('NA')).rejects.toThrow('Request failed');
    });
  });
});

