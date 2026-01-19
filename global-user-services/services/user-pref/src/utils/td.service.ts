import { MongoClient, WithId, Document } from "mongodb";
import * as config from '../env';
import { decrypt } from "../config/aes-encryption";
import axios from "axios";
import { dateToEpochTD } from "./userPrefHelper";
import { sendLogToNewRelic } from "../../newRelicLogger";

let TDConfigCache: Record<string, any> = {}; // key: regionId, value: config object

const client = new MongoClient(config.mongoUri);
const db = client.db(config.dbName);

export const loadTDConfig = async () => {
  const configCollection = db.collection(config.configCollection);
  try {
    const data = await configCollection.find({ appId: "TD", brandId: "all_user_register" }).toArray();
    // Store configs by regionId
    TDConfigCache = {};
    data.forEach((item: any) => {
      // Use regionId as key, fallback to 'default' if missing
      const itemKey = `${item.appId}_${item.brandId}_${item.regionId}`;
      TDConfigCache[itemKey] = item;
    });
  } catch (error) {
    console.log("Error while fetching TD configuration from database", error)
    throw new Error("Error while fetching TD configuration from database")
  }
}

export const getTDConfig = (cacheKey: string): any => {
  const configObj = TDConfigCache[cacheKey];
  const data: any = {};
  if (
    configObj &&
    Array.isArray(configObj.settings)
  ) {
    configObj.settings.forEach((item: any) => {
      switch (item.k) {
        case 'dbName':
          data.dbName = decrypt(item.v);
          break;
        case 'tableName':
          data.tableName = decrypt(item.v);
          break;
        case 'baseUri':
          data.baseUri = decrypt(item.v);
          break;
        case 'writeKey':
          data.writeKey = decrypt(item.v);
          break;
      }
    });
  }
  return data;
};

export async function getAuthTokenForTD() {
  const params = new URLSearchParams();
  params.append('client_id', config.tdClientId);
  params.append('client_secret', config.tdClientSecret);
  params.append('grant_type', 'client_credentials');

  try {
    const response = await axios.post(config.tdTokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response?.data?.access_token;
  } catch (error) {
    console.error('Error fetching token for TD');
    const logs = [
      {
        message: 'Error fetching token for TD',
        error: error,
        timestamp: Date.now(),
        logtype: 'INFO',
        service: 'uup-nonpii-pref',
        methodType: 'GET'
      }
    ];
    sendLogToNewRelic(logs);
    throw new Error('Error fetching token for TD');
  }
}


export const sendDataToTD = async (data: any) => {
  // Use data.region to get the correct config
  const cacheKey = `TD_all_user_register_${data.region}`;
  const configData = getTDConfig(cacheKey);
  if (!configData || (typeof configData === 'object' && Object.keys(configData).length === 0)) {
    const logs = [
          {
            microserviceName: "uup-nonpii-pref",
            moduleName: "createOrUpdatePreference",
            functionName: "createOrUpdatePreference",
            reasonForFailure: "TD Congiguration missing",
            message:  `error while sending Data to TD, TD Congiguration missing for - ${data.brand} : ${data.region} `,
            timestamp: Date.now(),
            logType: "ERROR",
            service: "uup-nonpii-pref",
            methodType: "POST",
          },
        ];
        sendLogToNewRelic(logs);
    return undefined;
}

  const payload: any = data;
  const baseUri = configData.baseUri?.replace(/\/$/, '');
  const dbName = configData.dbName?.replace(/^\//, '');
  const tableName = configData.tableName?.replace(/^\//, '');

  if (!baseUri || !dbName || !tableName) {
    throw new Error('Missing baseUri, dbName, or tableName in configData');
  }

  if (configData) {
    const baseURL = `${baseUri}/${dbName}/${tableName}`;
    let token: string;
    try {
      token = await getAuthTokenForTD();
    } catch (error) {
      console.log("Error while fetching TD token: ", error);
      return new Error((error as any).message);
    }
    const tdWritKey = `${configData.writeKey}`;

    if (baseURL && tdWritKey) {
      try {
        const response = await axios.post(baseURL, payload, {
          headers: {
            "Content-Type": "application/json",
            "RegionId" : data.region,
            "X-TD-Write-Key": tdWritKey,
            "Authorization": `Bearer ${token}`,
          }
        })
        return response.data;
      } catch (error) {
        console.log("Error while sending data to TD: ", error);
        return new Error((error as any).message)
      }
    }
  }
}

const getMUUID = async (uuid: string) => {
  const userProductAgg = db.collection("userProductAgg");
  const data = await userProductAgg.findOne({ uuid });
  return data?.MUUID || ""
}

export const formatDateToTD = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
