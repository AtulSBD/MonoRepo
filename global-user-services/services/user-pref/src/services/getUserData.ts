import axios from "axios";
import { uupBaseUrl } from "../env";
import { sendLogToNewRelic } from "../../newRelicLogger";

export const getUserData = async function (payload: any) {
    try {
        const response = await axios.post(
            `${uupBaseUrl}api/uup/users`, 
            {
                id: payload?.uuid, 
                brandId: payload?.brandId, 
                regionId: payload?.regionId, 
                locale: payload?.locale
            },  
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
       
        return response?.data

    } catch (error) {
        
       const logs = [
                 {
                   message: `User not found in AIC with given uuid: ${payload?.uuid} - brandId: ${payload?.brandId} - regionId: ${payload?.regionId} - locale: ${payload?.locale}`,
                   error,
                   timestamp: Date.now(),
                   logtype: 'ERROR',
                   service: 'uup-nonpii-pref',
                   methodType: 'GET'
                 }
               ];
               sendLogToNewRelic(logs);

        throw new Error(`User not found in AIC with given uuid: ${payload?.uuid} - brandId: ${payload?.brandId} - regionId: ${payload?.regionId} - locale: ${payload?.locale}`);

    }
}