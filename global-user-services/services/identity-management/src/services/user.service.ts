import * as config from "../env";
import { handleApiError } from "../Utils/errorHandler";
import { APP_IDS, getMarketIdByLanguage, validateBrandAndRegion } from "../Utils/shared";
import axios from "axios";
import { getConfig } from "./config.service";
import UserPII from "../models/UserPII.model";

export const userService = async (userData: any, id: string, brandId: string, regionId: string, access_token: string, locale: string): Promise<any> => {
    try {

            await validateBrandAndRegion({ brand: brandId, region: regionId });
            const marketId = await getMarketIdByLanguage(locale);
            const configData = getConfig(`${APP_IDS.AIC}_${brandId}_${regionId}_${marketId}_${locale}`);
        
            const url = `${config.baseURL}/oauth/update_profile_native`;
            const user = new UserPII(userData);
            const filteredUserData = Object.fromEntries(
                Object.entries(user).filter(([_, v]) => v !== undefined && v !== null && v !== '')
            );
            const body = {
              ...filteredUserData,
              client_id: configData.clientId,
              flow: configData.flow,
              flow_version: configData.flowVersion,
              form: "editProfileForm",
              access_token,
              locale
            };
        const response = await axios.post(url, body);

        // Return the response from the AIC API
        if (response.data?.stat === "error") {
            const apiError = handleApiError({ response }, "Failed to update user data", 400);
            return apiError;
        }
        // const data = req.body;
        
        return response.data;
    
    } catch (error) {
        const apiError = handleApiError({ error }, "Failed to update user data", 400);
        throw apiError
    }
}

export const getuserData = async (uuid: string, brand: string, region: string, locale:string) => {
    try {
        const marketId = await getMarketIdByLanguage(locale);
      const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);
        const attributes = '["email", "givenName", "familyName"]';
      const auth = {
        username: configData.ownerId || "",
        password: configData.ownerSecret || "",
      };
      const response = await axios.get(`${config.baseURL}/entity`, {
        params: {
          uuid,
          type_name: `${configData.entity}`,
          attributes: attributes,
        },
        auth,
      });
      if (response.data?.stat === "error") {
              const code = response.data.code === 200 ? 400 : 404;
              const apiError = handleApiError(
                { response },
                "Failed to fetch user data",
                code
              );
            }
        return response.data.result
    } catch (error) {
        throw error;
    }
}