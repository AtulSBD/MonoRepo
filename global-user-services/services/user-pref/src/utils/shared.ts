import { sendLogToNewRelic } from "../../newRelicLogger";
import mongoose from "mongoose";
import { getUserData } from "../services/getUserData";
import { regionCollection, userPrefsCollection } from "../types/coll-constants";
import { Collection, Document } from 'mongodb';

interface RegionDocument extends Document {
  _id: string;
}

export const validateBrandAndRegion = async (data: any) => {
    const brands = ["DW", "CM", "ST"];
    const region = await getRegionIdValue(data?.regionId);;
    if(!data.brandId || !data.regionId) {
        throw new Error(`Please provide the brandId and regionId\n Note: Currently we supporting only DW, CM and ST brands`);
    }
    if (!brands.includes(data.brandId.toUpperCase())) {
        throw new Error(`Invalid brand ID. Please provide a valid brand ID\n Note: Currently we supporting only DW, CM and ST brands`);
    }
    if (!region) {
        throw new Error(`Invalid region ID`);
    }
}

export function dateStringToEpoch(dateStr: string): number | undefined {
   if (typeof dateStr !== 'string' || !dateStr) return undefined;
  // dateStr format: "mm/dd/yyyy"
  const [month, day, year] = dateStr.split('/');
  if (!month || !day || !year) return undefined;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

// Handles "yyyy-mm-dd hh:mm:ss.ssssss +0000"
export function parseYYYYMMDD_HHMMSS_TO_TD(dateStr: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+ \+\d{4}$/.test(dateStr)) return undefined;
  const isoString = dateStr
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1')
    .replace(/ \+\d{4}$/, 'Z');
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

export function sanitizeUserPrefInput(input: any): any {
  // Shallow copy
  const userPrefInput = { ...input };

  // Remove top-level fields
  delete userPrefInput?.uuid;
  delete userPrefInput?.emailVerified;
  delete userPrefInput?.lastLogin;
  delete userPrefInput?.isLegacyUser;
  delete userPrefInput?.isMigrated;
  delete userPrefInput?.company;
  delete userPrefInput?.demographicTrades;
  delete userPrefInput?.jobRoleORFunction;
  delete userPrefInput?.websiteMemberAccountType;
  delete userPrefInput?.source;
  delete userPrefInput?.tool_usage;
  delete userPrefInput?.employmentStatus;

  // Remove nested fields from demographic if present
  if (userPrefInput?.demographic) {
    delete userPrefInput?.demographic.employmentStatus;
    delete userPrefInput?.demographic.occupation;
    delete userPrefInput?.demographic.trade;
  }

  return userPrefInput;
}


export const dateToEpochTD = (date: Date): string => {
    return Math.floor(date.getTime() / 1000).toString();
};



export const getRegionIdValue = async (regionId: string): Promise<string | null> => {
  if (!regionId) return null;
  const regionColl: Collection<RegionDocument> = await mongoose.connection.collection(regionCollection);
  const doc = await regionColl.findOne(
    { _id: regionId.toUpperCase() }, 
    { projection: { _id: 1 } }
  );
  return doc ? doc._id : null;
}


export async function getUserFullData(
  uuid: string,
  brandId: string,
  regionId: string,
  locale: string
) {
  const match: any = { uuid, brandId, regionId };
      const userPrefCollection = await mongoose.connection.collection(userPrefsCollection);
      
      let piData;
      try {
        piData = await getUserData({uuid, brandId, regionId, locale});
      } catch (error) {
         const logs = [
            {
              message: `Records not found with given uuid: ${uuid}, brandId: ${brandId}, regionId: ${regionId} and locale: ${locale}`,
              timestamp: Date.now(),
              logtype: 'INFO',
              service: 'uup-nonpii-pref',
              methodType: 'GET'
            }
          ];
        sendLogToNewRelic(logs);
        throw new Error(`Records not found with given uuid: ${uuid}, brandId: ${brandId}, regionId: ${regionId} and locale: ${locale}`);
      }

      // Run aggregation
      const userPrefs = await userPrefCollection.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "userProductAgg",
            let: { uuid: "$uuid", brandId: "$brandId", regionId: "$regionId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$uuid", "$$uuid"] },
                      { $eq: ["$brandId", "$$brandId"] },
                      { $eq: ["$regionId", "$$regionId"] }
                    ]
                  }
                }
              },
              { $limit: 1 }
            ],
            as: "productAggData"
          }
        },
        { $unwind: { path: "$productAggData", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: "$_id",
            userId: "$userId",
            MUUID: "$MUUID",
            uuid: "$uuid",
            tool_usage: "$productAggData.tool_usage",
            company: "$company",
            brandId: "$brandId",
            regionId: "$regionId",
            market: "$market",
            marketId: "$marketId",
            countryOfResidence: "$countryOfResidence",
            optInNewsletters: "$optInNewsletters",
            optOutNewslettersDate: "$optOutNewslettersDate",
            demographicTrades: "$demographicTrades",
            source: "$productAggData.source",
            phone: "$phone",
            demographicemploymentStatus: "$demographicemploymentStatus",
            optinConfirmDate: "$optinConfirmDate",
            optInProductResearch: "$optInProductResearch",
            optInProductResearchDate: "$optInProductResearchDate",
            optOutProductResearchDate: "$optOutProductResearchDate",
            optInNewsletterDate: "$optInNewsletterDate",
            projects: "$projects",
            accountStatus: "$accountStatus",
            productsMigrationStatus: "$productsMigrationStatus",
            profileMigrationStatus: "$profileMigrationStatus",
            updatedDate: "$updatedDate",
            myInterests: "$myInterests",
            myExpertise: "$myExpertise",
            sms: "$sms",
            smsDate: "$smsDate",
            myStores: "$myStores",
            typeOfConstructionWorks: "$typeOfConstructionWorks",
            experiencelevel: "$experiencelevel",
            jobRoleORFunction: "$jobRoleORFunction",
            purchaseLocations: "$purchaseLocations",
            myYardSize: "$myYardSize",
            myDrivewaySize: "$myDrivewaySize",
            howToServiceEquipment: "$howToServiceEquipment",
            isSelfOrBusinessUse: "$isSelfOrBusinessUse",
            updatedBy: "$updatedBy",
            websiteMemberAccountType: "$productAggData.websiteMemberAccountType",
            advertisingConsent: "$advertisingConsent",
            advertisingConsentDate: "$advertisingConsentDate",
            globalId: "$globalId",
            clientId: "$clientId",
            shop: "$shop",
            retailers: "retailers",
            language: "$language"
          }
        }
      ]).toArray();
  
      if (!userPrefs.length) {
        const logs = [
            {
              message: 'Records not found with given uuid, brandId and regionId',
              timestamp: Date.now(),
              logtype: 'INFO',
              service: 'uup-nonpii-pref',
              methodType: 'GET'
            }
          ];
        sendLogToNewRelic(logs);
        throw new Error(`Records not found with given uuid, brandId and regionId`);
      }
  
      // Extract firstName, lastName, muuid, and emailverified from piData
      const familyname = piData?.data?.lastName ?? '';       
      const givenname = piData?.data?.firstName ?? '';
      const muuid = piData?.data?.MUUID ?? '';
      const emailverified = piData?.data?.emailVerified ?? '';

      return { ...userPrefs[0], familyname, givenname, muuid, emailverified };
}


export function mapPreferencesToFields(data: any) {
  return {
    email: data?.userId ?? null,
    aic_uuid: data?.uuid ?? null,
    brand: data?.brandId ?? null,
    region: data?.regionId ?? null,
    market: data?.marketId ?? null,
    preferred_language: data?.language ?? null,
    websitememberaccounttype: data?.websiteMemberAccountType ?? null,
    source: data?.source ?? null,
    company: data?.company ?? null,
    employment_status: data?.demographicemploymentStatus ?? null,
    tool_usage: data?.tool_usage ?? null,
    my_trade: data?.demographicTrades ?? null,
    opt_in_marketing_product_research: data?.optInProductResearch ?? null,
    optinproductresearchdate: data?.optInProductResearchDate ? dateToEpochTD(new Date(data.optInProductResearchDate)) : null,
    optoutproductresearchdate: data?.optOutProductResearchDate ? dateToEpochTD(new Date(data.optOutProductResearchDate)) : null,
    optinnewsletters: data?.optInNewsletters ?? null,
    optinnewslettersdate: data?.optInNewsletterDate ? dateToEpochTD(new Date(data.optInNewsletterDate)) : null,
    optoutnewslettersdate: data?.optOutNewslettersDate ? dateToEpochTD(new Date(data.optOutNewslettersDate)) : null,
    optinconfirmationdate: data?.optinConfirmDate ? dateToEpochTD(new Date(data.optinConfirmDate)) : null,
    advertisingconsent: data?.advertisingConsent ?? null,
    advertisingconsentdate: data?.advertisingConsentDate ? dateToEpochTD(new Date(data.advertisingConsentDate)) : null,
    sms: data?.sms ?? null,
    smsdate: data?.smsDate ? dateToEpochTD(new Date(data.smsDate)) : null,
    status: data?.accountstatus ?? null,
    myinterests: data?.myInterests ?? null,
    jobrole: data?.jobRoleORFunction ?? null,
    familyname: data?.familyname ?? null,
    givenname: data?.givenname ?? null,
    lastupdateddate: data?.lastupdatedate ?? null,
    muuid: data?.muuid ?? null,
    emailverified: data?.emailverified ? parseYYYYMMDD_HHMMSS_TO_TD( data?.emailverified ) : null
  };
}


export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Function to format memory usage into MB or GB
export function formatMemory(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
}