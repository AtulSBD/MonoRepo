import { IUser } from "../models/userModel";
import crypto from 'crypto';

import * as config from "../env";
import axios from "axios";
import { getConfig } from "../services/config.service";
import UserResponse from "../models/UserResponse.model";
import { sendLogToNewRelic } from "./newRelicLogger";
import {Market, Region} from "../models/UserMuuid.model";



export const validatePassword = (password: string): void => {
    const passwordRegex =
        /^(?=.*[!@#$%^&*()_\+\[\]{};':"\\|,.<>\/?\-])(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
    const forbiddenWordRegex = /password/i;

    if (forbiddenWordRegex.test(password)) {
        throw new Error(
            "Password must not contain the word 'password' or its variations."
        );
    }

    if (!passwordRegex.test(password)) {
        throw new Error(
            "Password must be at least 8 characters long, contain at least one special character, one uppercase letter, one lowercase letter, and one numeric value."
        );
    }
}

export const validateConfirmPassword = (password: string, confirmPassword: string): void => {
    if (password !== confirmPassword) {
        throw new Error("Confirm password does not match")
    }
}

export const validateEmail = (email: string): void => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        throw new Error("Invalid email address")
    }
}

export const validateRequiredField = (data: IUser, isGated = true) => {
    const missingFields: string[] = [];

    if (!data.region) missingFields.push("region");
    if (!data.brand) missingFields.push("brand");
    if (!data.market) missingFields.push("market");
    if (!data.givenName) missingFields.push("givenName");
    if (!data.familyName) missingFields.push("familyName");
    if (!data.emailAddress) missingFields.push("email address");
    if (
        !isGated &&
        !(
          typeof data.optInNewsletters === "boolean" ||
          typeof data.emailConsent === "boolean"
        )
      ) {
        missingFields.push("optInNewsletters/emailConsent");
    }

    if (missingFields.length > 0) {
        throw new Error(`Mandatory fields are missing: ${missingFields.join(", ")}`);
    }
};

export const validateBrandAndRegion = async (data: any) => {
    const brands = ["DW", "CM", "ST"];
    const region = await getRegionIdValue(data?.region);
    if(!data.brand || !data.region) {
        throw new Error(`Please provide the brandId and regionId\n Note: Currently we supporting only DW, CM and ST brands`);
    }
    if (!brands.includes(data.brand.toUpperCase())) {
        throw new Error(`Invalid brand ID. Please provide a valid brand ID\n Note: Currently we supporting only DW, CM and ST brands`);
    }
    if (!region) {
        throw new Error(`Invalid region ID`);
    }
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


export const dateToEpochTD = (date: Date): string => {
    return Math.floor(date.getTime() / 1000).toString();
};

export const convertGraphQLErrorToPlainString = (errorMessage: string): string => {
    const regex = /Variable "(.*?)" got invalid value (.*?); (.*)/;
    const match = errorMessage.match(regex);
  
    if (match) {
      const [, variable, value, reason] = match;
      return `Invalid value ${value} provided for ${variable}. Reason: ${reason}`;
    }
    
    return 'An error occurred while processing your request.';
  }


export const encrypt = (value: string): string => {
  const algorithm = 'aes-256-cbc';
  //const key = crypto.createHash('sha256').update(process.env.LOCAL_MASTER_KEY || '').digest().slice(0, 32);
  const key = crypto.createHash('sha256').update(config.AES_SECRET).digest()
  const iv = Buffer.from(config.AES_IV , 'hex'); // IV loaded from environment variable
  if (iv.length !== 16) {
    throw new Error('Invalid IV length. Ensure AES_IV is a 16-byte hex string.');
  }

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encryptedValue = cipher.update(value, 'utf8', 'hex');
  encryptedValue += cipher.final('hex');

  const encryptedString = encryptedValue;
  return encryptedString;
};

export const decrypt = (encryptedString: string) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(config.AES_SECRET).digest()

    if (!encryptedString || typeof encryptedString !== 'string') {
        throw new Error(`Invalid encrypted string format: ${encryptedString ?? 'undefined'}`);
    }
    const iv = Buffer.from(config.AES_IV, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decryptedValue = decipher.update(encryptedString, 'hex', 'utf8');
    decryptedValue += decipher.final('utf8');

    return decryptedValue;
};

export const APP_IDS = { AIC: "AIC", TD: "TD",ITERABLE:"ITERABLE" }
export async function fetchUserDetailsFromAicApi(id: string, brandId: string, regionId: string,locale:string) {
    const marketId = await getMarketIdByLanguage(locale);
      const configData = getConfig(`${APP_IDS.AIC}_${brandId}_${regionId}_${marketId}_${locale}`);
    const attributes= '["givenName","familyName","source","websiteMemberAccountType","emailVerified","migratedDate","websiteRegistrationDate"]';
    const auth = {
      username: configData.ownerId || "",
      password: configData.ownerSecret || "",
    };
  
    try {
      const response = await axios.get(`${config.baseURL}/entity`, {
        params: {
          uuid: id,
          type_name: `${configData.entity}`,
          attributes:attributes,
        },
        auth,
      });
      if (response.data?.stat === "error") {
        const code = response.data.code === 200 ? 400 : 404;
        throw new Error("Failed to fetch user data");
      }
   
      return response.data.result;
   
    } catch (error:any) {
      throw error;
    }
  }

// 1. Extracted AIC fetch logic
export async function getUserDetailsFromAIC(uuid: string, brandId: string, regionId: string,locale:string) {
  try {
    const brand = brandId.toUpperCase();
    const region = regionId.toUpperCase();
    const marketId = await getMarketIdByLanguage(locale);
      const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

    const auth = {
      username: configData.ownerId || "",
      password: configData.ownerSecret || "",
    };
    const response = await axios.get(`${config.baseURL}/entity`, {
      params: {
        uuid: uuid,
        type_name: `${configData.entity}`
      },
      auth,
    });

    if (response.data?.stat === "error") {
      console.error(`AIC error: ${JSON.stringify(response.data)}`);
      return null;
    }
    
    
return {
  userpi: new UserResponse(response.data.result),
  createdDate: response.data.result.created,
  lastLogin: response.data.result.lastLogin
};

  } catch (err) {
    console.error('Error fetching user details from AIC:', err instanceof Error ? err.stack : err);
    return null;
  }
}

export const normalizeAICUser = (userpi: any): Partial<IUser> => {
   if (!userpi) return {};
  const { firstName, lastName, ...rest } = userpi;  
  return {
      givenName: userpi.firstName,
      familyName: userpi.lastName,
     ...rest,
    };
}

export const getMarketIdByLanguage = async (locale: string): Promise<string | null> => {
  const doc = await Market.findOne({ languages: locale }, '_id').lean();
  return doc ? doc._id.toString() : null;
};


export async function fetchAicUserData(userProductAggs: any, locale: any) {
  const aicUserData = [];

  for (const agg of userProductAggs) {
    const brand = agg?.brandId.toUpperCase();
    const region = agg?.regionId.toUpperCase();
    const marketId = await getMarketIdByLanguage(locale);
    const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

    const auth = {
      username: configData.ownerId || "",
      password: configData.ownerSecret || "",
    };

    try {
      const response = await axios.get(`${config.baseURL}/entity`, {
        params: {
          uuid: agg?.uuid,
          type_name: `${configData.entity}`
        },
        auth,
      });

      if (response.data?.stat === "error") {
        console.error(`AIC error: ${JSON.stringify(response.data)}`);
        const logs = [
          {
            message: `${JSON.stringify(response.data)}`,
            timestamp: Date.now(),
            logtype: "ERROR",
            service: "uup",
            endpoint: "get_user_by_muuid",
          },
        ];
        sendLogToNewRelic(logs);
        continue; // skip this iteration
      }

      const aic_user = new UserResponse(response.data.result);
      aicUserData.push( aic_user );

    } catch (err) {
      console.error(`AIC fetch error: ${err}`);
      const logs = [
        {
          message: `${err}`,
          timestamp: Date.now(),
          logtype: "ERROR",
          service: "uup",
          endpoint: "get_user_by_muuid",
        },
      ];
      sendLogToNewRelic(logs);
      continue; // skip this iteration
    }
  }

  return aicUserData;
}

export const getRegionIdValue = async (regionId: string): Promise<string | null > => {
  if (!regionId) return null;
  const doc = await Region.findOne({ _id: regionId.toLocaleUpperCase() }, '_id').lean();
  return doc ? doc._id.toString() : null;
}