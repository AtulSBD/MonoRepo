import * as config from '../env'
import { APP_IDS, decrypt } from "../Utils/shared";
import CacheService from "./cache.service";
import mongoose from 'mongoose';

export const setConfig = async (appId: string) => {
    const cache = CacheService.getInstance();
    const cacheAll = CacheService.getInstance();
    
    const configCollection = mongoose.connection.collection(config.configCollection);
    try {
        const data = await configCollection.find({appId: appId}).toArray();
        cacheAll.set(appId, data);
       data.forEach(item => {
    let key;
 
    if (item.appId === APP_IDS.AIC) {
        // New key structure for AIC
        key = item.group
            ? `${item.appId}_${item.brandId}_${item.regionId}_${item.marketId}_${item.locale}_${item.group}`
            : `${item.appId}_${item.brandId}_${item.regionId}_${item.marketId}_${item.locale}`;
    } else {
        // Keep existing key structure for all other appIds
        key = item.group
            ? `${item.appId}_${item.brandId}_${item.regionId}_${item.group}`
            : `${item.appId}_${item.brandId}_${item.regionId}`;
    }
 
    cache.set(key, item.settings);
})
    } catch (error) {
        throw new Error("Error while fetching configuration from database")
    }
}

export const getConfig = (cacheId: string) => {
    const cache = CacheService.getInstance();
    const configData = cache.get(cacheId);
    const data: any = {}
    if (configData) {
        configData.forEach((item: any) => {
            switch(item.k) {
                case 'website':
                    data.website = decrypt(item.v)
                    break;
                case 'clientId':
                    data.clientId = decrypt(item.v)
                    break;
                case 'clientSecret':
                    data.clientSecret = decrypt(item.v)
                    break;
                case 'ownerId':
                    data.ownerId = decrypt(item.v)
                    break;
                case 'ownerSecret':
                    data.ownerSecret = decrypt(item.v)
                    break;
                case 'flow':
                    data.flow = decrypt(item.v)
                    break;
                case 'flowVersion':
                    data.flowVersion = decrypt(item.v)
                    break;
                case 'passwordResetURL':
                    data.passwordResetURL = decrypt(item.v)
                    break;
                case 'emailVerifyURL':
                    data.emailVerifyURL = decrypt(item.v)
                    break;
                case 'entity':
                    data.entity = decrypt(item.v)
                    break;
            }
        })
    }
    return data;
}

export const getTDConfig = (cacheId: string) => {
    const cache = CacheService.getInstance();
    const configData = cache.get(cacheId);
    const data: any = {}
    if (configData) {
        configData.forEach((item: any) => {
            switch(item.k) {
                case 'dbName':
                    data.dbName = decrypt(item.v)
                    break;
                case 'tableName':
                    data.tableName = decrypt(item.v)
                    break;
                case 'baseUri':
                    data.baseUri = decrypt(item.v)
                    break;
                case 'writeKey':
                    data.writeKey = decrypt(item.v)
                    break;
            }
        })
    }
    return data;
}

export const getIterableConfig = (cacheId: string) => {
    const cache = CacheService.getInstance();
    const configData = cache.get(cacheId);
    const data: any = {}
    if (configData) {
        configData.forEach((item: any) => {
            switch(item.k) {
                case 'apikey':
                    data.apikey = decrypt(item.v)
                    break;
                case 'apiUrl':
                    data.apiUrl = decrypt(item.v)
                    break;
            }
        })
    }
    return data;
}
