import { ObjectId } from 'mongodb';

export interface Config {
    _id?: ObjectId;
    configId: string;
    desc: string;
    appId: string;
    brandId: string;
    regionId: string;
     marketId:string;
    locale:string;
    env: string;
    settings: {
      k: string;
      v: string; // This will be encrypted
    }[];
    group?: string;
}
export interface ConfigInput {
    configId: string;
    desc: string;
    appId: string;
    brandId: string;
    regionId: string;
    marketId:string;
    locale:string;
    env: string;
    settings: {
      k: string;
      v: string; // This will be encrypted
    }[];
    group?: string;
}

export interface Setting {
  v?: string; // or whatever type 'v' is before decryption
  [key: string]: any; // other possible properties
}

export interface EncryptConfig {
  configId?: string; // or whatever type configId is
  settings?: Setting[];
  [key: string]: any; // other possible properties
}