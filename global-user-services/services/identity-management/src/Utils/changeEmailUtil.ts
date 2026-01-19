import axios from "axios";
import * as config from "../env";
import { APP_IDS, getMarketIdByLanguage, validateBrandAndRegion } from "./shared";
import { getConfig } from "../services/config.service";
import mongoose from 'mongoose';

// Validate email format
export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};
 
// Validate request input
export const validateRequest = (body: { currentEmail: string, newEmail: string, password: string }): string | null => {
  const { currentEmail, newEmail, password } = body;
 
  if (!currentEmail || !newEmail || !password) {
    return 'currentEmail, newEmail, and password fields are required.';
  }
 
  if (!validateEmail(currentEmail) || !validateEmail(newEmail)) {
    return 'Invalid email format.';
  }

  return null;  // No validation errors
};

export const validateRequestSupport = (body: { currentEmail: string, newEmail: string,isDuploUser:boolean,isPolarisUser:boolean }): any | null => {
  const { currentEmail, newEmail, isDuploUser, isPolarisUser } = body;
 
  if (!currentEmail || !newEmail ) {
    return 'currentEmail and newEmail fields are required.';
  }
  if (typeof isDuploUser !== 'boolean' || typeof isPolarisUser !== 'boolean') {
  return 'isDuploUser and isPolarisUser must be boolean values.';
}
  if (isDuploUser === undefined ||  isPolarisUser === undefined) {
    return 'isDuploUser and isPolarisUser fields are required.';
  }
 if (isDuploUser === isPolarisUser) {
    return 'isDuploUser and isPolarisUser cannot both be true or both be false.';
  }
  if (!validateEmail(currentEmail) || !validateEmail(newEmail)) {
    return 'Invalid email format.';
  }
 
  return null;  // No validation errors
};
 
// Get user profile with email and optional password
export const getUserProfile = async (email: string, password: string, brandId:string, regionId:string,locale:string, isDuplo=false): Promise<any> => {
  try {
    await validateBrandAndRegion({brand: brandId, region: regionId})
    const marketId = await getMarketIdByLanguage(locale);
    const key = isDuplo ? `${APP_IDS.AIC}_${brandId}_${regionId}_${marketId}_${locale}_duplo` : `${APP_IDS.AIC}_${brandId}_${regionId}_${marketId}_${locale}`
    const configData = getConfig(key);
   
    const params = {
      type_name: `${configData.entity}`,
      key_attribute: 'email',
      key_value: `"${email}"`,
      ...(password && {
        password_attribute: 'password',
        password_value: password
      })
    };

 const auth = {
  username: configData.ownerId || "",
  password: configData.ownerSecret || ""
}
 
    const response = await axios.get(`${config.baseURL}/entity`,
      {
        params,
        auth,  
      }
    );

    if (response.data?.result?.uuid) {
     const { uuid, MUUID } = response.data.result;
      return { uuid, MUUID }
    }
    return null;
 
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // User not found
    }
    if (error.response?.status === 401) {
      return null; // Invalid credentials
    }
    return null; // Other errors
  }
};

export const getAccessTokenByUUID = async (uuid: string,brandId: string,regionId: string,locale:string, isDuplo=false): Promise<any> => {
  try {
    await validateBrandAndRegion({brand: brandId, region: regionId})
    const marketId = await getMarketIdByLanguage(locale);
    const key = isDuplo ? `${APP_IDS.AIC}_${brandId}_${regionId}_${marketId}_${locale}_duplo` : `${APP_IDS.AIC}_${brandId}_${regionId}_${marketId}_${locale}`
    const configData = getConfig(key);
    const response = await axios.get(`${config.baseURL}/access/getAccessToken`, {
      params: {
        type_name: `${configData.entity}`,
        key_attribute: 'uuid',
        key_value: `"${uuid}"`
      },
      auth: {
       username: configData.ownerId || "",
        password: configData.ownerSecret || ""
      }
    });
 
    return response.data.accessToken || null;
  } catch (error: any) {
    console.error('Error getting access token:', error?.response?.data || error.message);
    return null;
  }
};

export const triggerEmailVerification = 
async (
  accessToken: string,
  newEmail: string,
  brandId:string,
  regionId:string,
  locale: string,
  isDuploUser: boolean,
): Promise<boolean> => {
  try {
    await validateBrandAndRegion({brand: brandId, region: regionId})
    const marketId = await getMarketIdByLanguage(locale);
    const key = isDuploUser ? `${APP_IDS.AIC}_${brandId}_${regionId}_${marketId}_${locale}_duplo` : `${APP_IDS.AIC}_${brandId}_${regionId}_${marketId}_${locale}`
    const configData = getConfig(key);
    const payload = {
            client_id: configData.clientId as string,
            flow: configData.flow as string,
            flow_version: configData.flowVersion as string,
    locale: locale,
      form: 'editProfileForm',
      emailAddress: newEmail,
      access_token: accessToken
    };
 
    const response = await axios.post(
      `${config.baseURL}/oauth/update_profile_native`,
      payload,
      {
        auth: {
          username: configData.ownerId || "",
           password: configData.ownerSecret || ""
         }
      }
    );
 
    return response.status === 200;
  } catch (error: any) {
    console.error('triggerEmailVerification error:', error?.response?.data || error.message);
    return false
  }
};
 

export const updateEmailPref = async (
  uuid: string,
  brandId: string,
  regionId: string,
  currentEmail: string,
  newEmail: string
): Promise<any | null> => {
  try {

    const result = await mongoose.connection.collection('userPref').findOneAndUpdate(
      {
        uuid,
        brandId: brandId,
        regionId: regionId,
        userId: currentEmail
      },
      {
        $set: { userId: newEmail }
      },
      {
        returnDocument: 'after' // returns updated doc
      }
    );

    if (result) {
      (async () => {
        try {
          const { uuid, updatedBy, ...dataWithoutUuid } = result;
          const activity = {
            uuid,
            data: dataWithoutUuid,
            updatedBy: updatedBy, // or use currentEmail if you prefer
            createdDate: Math.floor(Date.now() / 1000)
          };
          await mongoose.connection.collection('userPrefActivityLog').insertOne(activity);
        } catch (logError) {
        }
      })();
      return result;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};
 
