import axios from "axios";
import https from 'https';
import UserPII from "../models/UserPII.model";
import { changeEmailTD, UserTD } from "../models/UserTD.model";
import { IUser } from "../models/userModel";
import { UserPref } from "../models/UserPref.model";
import rateLimit from "express-rate-limit";
import { errorResponse } from "../Utils/responseWrapper";
import * as config from "../env";
import { getConfig, getIterableConfig, getTDConfig } from "./config.service";
import { getUserByUUID } from "../Utils/userMuuid";
import { dateToEpochTD, APP_IDS } from "../Utils/shared";
import { NewsletterTD } from "../models/newsletterTD.model";
import { sendFullUserDataToTD } from "../Utils/sendAllDataTD";
import { sendLogToNewRelic } from "../Utils/newRelicLogger";



type Callback<T> = (error: Error | null, result?: T | null) => void;

const agent = new https.Agent({ rejectUnauthorized: false })
const agent2 = new https.Agent({ keepAlive: false })


export const sendNonPIIData = async (data: IUser): Promise<any> => {
    let userPrefData = new UserPref(data);
    userPrefData.reqFromIdentityManagement = true;
    const GRAPHQL_API_URL = `${config.graphqlURL}`;
    try {
        const mutation = `mutation CreateOrUpdateUserPref($input: UserPrefInput) {
            createOrUpdateUserPref(input: $input)
        }
        `
        const response = await axios.post(
            GRAPHQL_API_URL,
            {
                query: mutation,
                variables: { input: userPrefData }
            },
            { httpsAgent: agent }
        )


        return response.data;
    } catch (error) {
        throw (error as any).response.data
    }
}

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
        throw error;
    }
}

export const registerWithTD = async (data: IUser, type: "signup" | "nl" | "changeEmail"): Promise<any> => {
    let body;
    let baseURL = '';
    let tdWritKey = '';
    let TDConfigKey = '';
    switch (type) {
        case "signup":
            body = new UserTD(data);
            TDConfigKey = `TD_all_user_register_${body.region.toUpperCase()}`;
            break;
        case "nl":

            // Remove updateDate if it exists
            if ("updateDate" in data) {
                delete (data as any).updateDate;
            }

            body = new NewsletterTD(data);
            TDConfigKey = `TD_all_user_nl_${body.region.toUpperCase()}`;
            break;
        case "changeEmail":
            body = new changeEmailTD(data);
            TDConfigKey = `TD_all_user_change_${body.region.toUpperCase()}`;
            break;
    }
    if (body.region) {

        const configData = getTDConfig(TDConfigKey);
       if (!configData || (typeof configData === 'object' && Object.keys(configData).length === 0)) {
    const logs = [
          {
            microserviceName: "UUP",
            moduleName: "idenityManagemnet",
            functionName: "idenityManagemnet",
            reasonForFailure: "TD Congiguration missing",
            message:  `error while sending Data to TD, TD Congiguration missing for - ${data.brand} : ${data.region} `,
            timestamp: Date.now(),
            logType: "ERROR",
            service: "authService",
            methodType: "POST",
          },
        ];
        sendLogToNewRelic(logs);
    return undefined;
}
        const baseUri = configData.baseUri?.replace(/\/$/, '');
        const dbName = configData.dbName?.replace(/^\//, '');
        const tableName = configData.tableName?.replace(/^\//, '');

        if (configData) {
            baseURL = `${configData.baseUri}/${configData.dbName}/${configData.tableName}`;
            // const token = await getAuthTokenForTD();
            let token: string;
            try {
                token = await getAuthTokenForTD();
            } catch (error) {
                return new Error((error as any).message);
            }
            tdWritKey = `${configData.writeKey}`;
            if (baseURL && tdWritKey) {
                try {
                    const response = await axios.post(baseURL, body, {
                        headers: {
                            "Content-Type": "application/json",
                            "RegionId": body.region,
                            "X-TD-Write-Key": tdWritKey,
                            "Authorization": `Bearer ${token}`,
                        },
                        httpsAgent: agent2
                    })
                    return response.data;
                } catch (error) {
                    return new Error((error as any).message)
                }
            }
            return;
        }
        return;
    }
}

export const updateEmailVerifiedStatusToTD = async (uuid: string, regionId: string, locale: string): Promise<any> => {
    let userData: any = null; // Declare outside try/catch
    try {
        const TDConfigKey = `TD_all_user_register_${regionId.toUpperCase()}`;
        const configData = getTDConfig(TDConfigKey);
        const baseURL = `${configData.baseUri}/${configData.dbName}/${configData.tableName}`;
        const tdWritKey = `${configData.writeKey}`;
        userData = await getUserByUUID(uuid);
        if (!userData.muuid) {
            // NewRelic log for missing user
            sendLogToNewRelic([{
                message: `No user found with UUID: ${uuid}`,
                timestamp: Date.now(),
                logtype: "ERROR",
                service: "uup",
                endpoint: "updateEmailVerifiedStatusToTD",
                uuid: userData.uuid,
                brandId: userData.brandId,
                regionId: regionId
            }]);
            throw new Error("There are not user with this UUID");
        }
        const body = {
            emailverified: dateToEpochTD(new Date()),
            updatedDate: new Date(),
            locale: locale
        }
        const response = await sendFullUserDataToTD(userData.uuid, userData.brandId, regionId, body);

        // NewRelic log for success
        sendLogToNewRelic([{
            message: `Email verified status sent to TD for UUID: ${uuid}`,
            timestamp: Date.now(),
            logtype: "INFO",
            service: "uup",
            endpoint: "updateEmailVerifiedStatusToTD",
            uuid: userData.uuid,
            brandId: userData.brandId,
            regionId: regionId
        }]);

        return response;
    } catch (error) {
        // NewRelic log for error
        sendLogToNewRelic([{
            message: `Error while sending email verified status data to TD: ${(error as any).message}`,
            timestamp: Date.now(),
            logtype: "ERROR",
            service: "uup",
            endpoint: "updateEmailVerifiedStatusToTD",
            uuid: userData?.uuid || uuid, // fallback to uuid param
            brandId: userData?.brandId || null,
            regionId: regionId
        }]);
        return new Error((error as any).message)
    }
}



export const registerWithAIC = async (data: IUser, callback: Callback<any>): Promise<void> => {
    const registerBody = new UserPII(data)
    try {
        const configData = getConfig(`${APP_IDS.AIC}_${registerBody.brand}_${registerBody.region.toUpperCase()}_${registerBody.market.toUpperCase()}_${data.locale}`);
        const newUser = {
            ...registerBody,
            client_id: configData.clientId as string,
            flow: configData.flow as string,
            flow_version: configData.flowVersion as string,
            form: "registrationForm",
            locale: data.locale,
            redirect_uri: data.redirect_uri,
            response_type: "code"
        };
        // const user = await findUser(registerBody.emailAddress, registerBody.displayName);
        // const isUserExist = user.status;

        const response = await axios.post(`${config.baseURL}/oauth/register_native_traditional` as string, newUser);
        if (response.data?.stat === "error") {
            return callback(response.data, null)
        }
        return callback(null, response.data)
    } catch (error) {
        return callback(error as Error, null)
    }
}

export const migrateLagecyUserDataGPR = async (data: IUser): Promise<any> => {
    const MIGRATE_API_URL = `${config.migrateApiUrl}/lagacyUserProductRegistration`;
    try {
        const { emailAddress, brand, region, market, uuid, MUUID } = data;
        const payload = {
            emailAddress,
            brandId: brand,
            regionId: region,
            marketId: market,
            uuid,
            MUUID
        }
        const response = await axios.post(MIGRATE_API_URL, payload, { httpsAgent: agent2 });
        return response.data
    } catch (error) {
        return new Error((error as any).message)
    }
}
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 5 attempts
    message: errorResponse("Too many login attempts, Try again later", 429),
    statusCode: 429,
    headers: true
})

export const changeEmailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 attempts
    message: errorResponse("Too many change email attempts, Try again later", 429),
    statusCode: 429,
    headers: true
})

export const registerWithIterable = async (data: IUser): Promise<any> => {
    const newData: any = data
    newData.locale_code = data.locale.split('-').reverse().join('-')
    newData.first_name = data.givenName
    newData.last_name = data.familyName
    newData.source = data.source
    newData.market = data.marketName
    newData.brand = data.brand
    const payload = {
        "eventName": "DOI_TRIGGER",
        "email": data?.emailAddress,
        "dataFields": newData
    }


    let body = data;

    if (body.region) {
        data.region = data?.region == "EM_EANZ" ? "EMEA" : data?.region;
        const iterableConfigKey = `ITERABLE_${data?.brand}_${data?.region}`;
        const configIterableData = getIterableConfig(iterableConfigKey);
        const baseURL = configIterableData?.apiUrl;
        const iterableWriteKey = configIterableData?.apikey;

        if (configIterableData && baseURL && iterableConfigKey) {

            try {
                const response = await axios.post(baseURL, payload, {
                    headers: {
                        "Content-Type": "application/json",
                        "Api-Key": iterableWriteKey
                    },
                })
                return response.data;
            } catch (error) {
                return new Error((error as any).message)
            }
        }
        return;
    }
    return;
}


