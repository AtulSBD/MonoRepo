import { ApolloError } from 'apollo-server-express';
import { ConfigService } from './config-service';
import { Config } from './config-model';
import {APP_IDS} from '../utils/userPrefHelper'

export const configResolvers = {
  Query: {
    configs: async (
      _parent: any,
      args: {
        configId?: string;
        appId?: string;
        brandId?: string;
        regionId?: string;
        locale?:string;
        marketId?:string;
        env?: string;
        pgSize?: number;
        pgIndex?: number;
      }
    ) => {
      const srv = new ConfigService();

      // Pagination defaults
      if (!args.pgIndex) args.pgIndex = 1;
      if (!args.pgSize) args.pgSize = 10;
      const skip = args.pgSize * (args.pgIndex - 1);

      // Build query params
      const queryParams: any = {};
      if (args.configId) queryParams.configId = args.configId;
      if (args.appId) queryParams.appId = args.appId;
      if (args.brandId) queryParams.brandId = args.brandId;
      if (args.regionId) queryParams.regionId = args.regionId;
      if (args.locale) queryParams.locale = args.locale;
      if (args.marketId) queryParams.marketId = args.marketId;
      if (args.env) queryParams.env = args.env;

      // Fetch and paginate
      const allConfigs = await srv.getConfig(queryParams);
      return allConfigs.slice(skip, skip + args.pgSize);
    }
  },
  Mutation: {
    createOrUpdateConfig: async (_parent: any, args: { input: Config[] }) => {
      const srv = new ConfigService();
      const config: Config[] = args.input;

      const errors: string[] = [];
      
      for (const c of config) {
        const configErrors: string[] = [];
        // Validate config object
        if (!c.configId) {
          configErrors.push("configId is required");
        }
        if (!c.appId) {
          configErrors.push("appId is required");
        }
        if (!c.brandId) {
          configErrors.push("brandId is required");
        }
        if (!c.regionId) {
          configErrors.push("regionId is required");
        }
         if (!c.locale && c.appId === APP_IDS.AIC) {
         configErrors.push("locale is required");
         }
         if (!c.marketId && c.appId === APP_IDS.AIC) {
         configErrors.push("marketId is required");
         }
        if (!c.env) {
          configErrors.push("env is required");
        }
        if (!c.settings || !Array.isArray(c.settings) || c.settings.length === 0) {
          configErrors.push("settings is required and must be a non-empty array");
        }
        
        if (configErrors.length > 0) {
          errors.push(`Config with index ${config.indexOf(c)}: ${configErrors.join(', ')}`);
        }
      }
      
      if (errors.length > 0) {
        throw new ApolloError(`Validation errors: ${errors.join('; ')}`);
      }
      const res = await srv.createOrUpdateConfig(config);
      return res;
    }
  }
};