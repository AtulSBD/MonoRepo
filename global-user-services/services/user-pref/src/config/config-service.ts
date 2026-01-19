import mongoose from "mongoose";
import { decrypt, encrypt } from "./aes-encryption";
import { configCollection } from "../types/coll-constants";
import {  EncryptConfig, Setting } from "./config-model";

export class ConfigService {
  async createOrUpdateConfig(configs: any[] | any[]): Promise<string> {
    const configsArray = Array.isArray(configs) ? configs : [configs];

    try {
      const coll =await  mongoose.connection.collection(configCollection);

      for (const config of configsArray) {
        const { configId, desc, appId, brandId, regionId,marketId,locale, businessUnitedId, settings, group, env } = config;
        const encryptedSettings = await Promise.all(
          settings.map(async (setting: any) => {
            if (!setting.v) return setting;
            return {
              ...setting,
              v: await encrypt(setting.v),
            };
          })
        );

        const configData = {
          configId,
          desc,
          appId,
          brandId,
          regionId,
          marketId,
          locale,
          businessUnitedId,
          env,
          settings: encryptedSettings,
          group,
        };
        await coll.updateOne({ configId: configData.configId }, { $set: configData }, { upsert: true });
      }

      return 'Configs processed successfully';
    } catch (error) {
      console.error('Error creating/updating configs:', error);
      throw new Error('Error creating/updating configs');
    }
  }

  async getConfig(queryParams: {
    configId?: string;
    appId?: string;
    brandId?: string;
    regionId?: string;
    marketId?:string;
    locale?:string;
    env?: string;
  }): Promise<any[]> {
    try {
      const coll = await mongoose.connection.collection(configCollection);

      const { configId, appId, brandId, regionId,marketId,locale, env } = queryParams;
      const query: any = {};
      if (configId) query.configId = configId;
      if (appId) query.appId = appId;
      if (brandId) query.brandId = brandId;
      if (regionId) query.regionId = regionId;
      if (marketId) query.marketId = marketId;
      if (locale) query.locale = locale;
      if (env) query.env = env;

      const encryptedConfigData = await coll.find(query).toArray();
      const decryptedConfigData = await Promise.all(
        encryptedConfigData.map(async (config:  EncryptConfig) => {
          try {
            if (!config.settings) return config;
            const decryptedSettings = await Promise.all(
              config.settings.map(async (setting: Setting) => {
                if (!setting.v) return setting;
                return {
                  ...setting,
                  v: await decrypt(setting.v),
                };
              })
            );
            return {
              ...config,
              settings: decryptedSettings,
            };
          } catch (error) {
            console.error(`Error decrypting config ${config.configId}:`, error);
            return { ...config, error: 'Decryption failed' };
          }
        })
      );
      return decryptedConfigData;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw new Error('Error fetching data');
    }
  }
}