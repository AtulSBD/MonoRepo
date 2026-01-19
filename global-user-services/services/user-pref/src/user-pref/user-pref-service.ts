import { PreferencesResponse, UserPref, UserPrefInfo, UserPrefFilter } from "./user-pref-model";
import mongoose from "mongoose";
import { userPrefsCollection, userPrefActivityLogCollection, userProductAggColl } from "../types/coll-constants";
import { sendDataToTD } from "../utils/td.service";
import { mapPreferencesToFields, getUserFullData } from "../utils/shared";

export class UserPrefService {
  brandId: any;
  regionId: any;

  async getPreferences(uuid: string, brandId: string, regionId: string, market?: string, limit: number = 10, skip: number = 0): Promise<PreferencesResponse> {


    const match: any = { uuid, brandId, regionId };

    if (market) match.marketId = market;
    const userPrefCollection = await mongoose.connection.collection(userPrefsCollection);
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
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          id: "$_id",
          userId: "$userId",
          MUUID: "$MUUID",
          uuid: "$productAggData.uuid",
          tool_usage: "$productAggData.tool_usage",
          company: "$productAggData.company",
          brandId: "$brandId",
          regionId: "$regionId",
          market: "$marketId",
          marketId: "$marketId",
          countryOfResidence: "$countryOfResidence",
          optInNewsletters: "$optInNewsletters",
          optOutNewslettersDate: "$optOutNewslettersDate",
          demographicTrades: "$demographicTrades",
          source: "$source",
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
          websiteMemberAccountType: "$websiteMemberAccountType",
          advertisingConsent: "$advertisingConsent",
          advertisingConsentDate: "$advertisingConsentDate",
          globalId: "$globalId",
          clientId: "$clientId",
          shop: "$productAggData.shop",
          retailers: "$productAggData.retailers"
        }
      }
    ]).toArray();

    if (!userPrefs.length) {
      throw new Error(`Records not found with given details`);
    }

    const firstPref = userPrefs[0];

    // Root fields: always prefer productAggData if available
    const rootFields = {
      uuid: firstPref?.uuid,
      MUUID: firstPref?.MUUID,
      brandId: firstPref?.brandId,
      regionId: firstPref?.regionId,
      userId: firstPref?.userId,
      tool_usage: firstPref?.tool_usage,
      myInterests: firstPref?.myInterests,
      role: firstPref?.jobRoleORFunction || [],
      demographic: {
        trade: Array.isArray(firstPref?.demographicTrades) ? firstPref.demographicTrades : []
      }
    };



    // Build arrayFields with merged data
    const arrayFields = userPrefs.map((pref: UserPrefInfo) => {
      const { uuid, MUUID, brandId, regionId, userId, tool_usage, myInterests, jobRoleORFunction, demographicTrades, ...rest } = pref;
      return rest;
    });


    const responseData: PreferencesResponse = {
      ...rootFields,
      userMarketPrefrences: arrayFields
    };

    return responseData;
  }


  async createOrUpdatePreference(input: UserPref): Promise<any> {
    const collection = await mongoose.connection.collection(userPrefsCollection);
    const productAggColl = await await mongoose.connection.collection(userProductAggColl);

    const { tool_usage, source,shop,retailers, market, websiteMemberAccountType, ...userPrefInput } = input;


    const productAggFilter: any = {
      brandId: input.brandId,
      regionId: input.regionId,

    };
    if (input.MUUID) {
      productAggFilter.MUUID = input.MUUID;
    } else if (input.uuid) {
      productAggFilter.uuid = input.uuid;
    }

    // Fields to always set on insert (creation)
    const setOnInsertFields = {
      MUUID: input?.MUUID,
      brandId: input?.brandId,
      regionId: input?.regionId,
    };


    // Fields user can update
    const setFields: any = {};
    if ('tool_usage' in input) setFields.tool_usage = input.tool_usage;
    if ('source' in input) setFields.source = input.source;
    if ('websiteMemberAccountType' in input) setFields.websiteMemberAccountType = input.websiteMemberAccountType;
    if ('shop' in input) setFields.shop = input.shop;
    if ('retailers' in input) setFields.retailers = input.retailers;
    if ('uuid' in input) setFields.uuid = input.uuid;

    const productAggUpdate = {
      $set: setFields,
      $setOnInsert: setOnInsertFields
    };

    try {
      const productAggResult = await productAggColl.findOneAndUpdate(
        productAggFilter,
        productAggUpdate,
        { upsert: true, returnDocument: "after" }
      );

      if (!productAggResult) {
        throw new Error("Failed to create or update userProductdAgg collection");
      }
    } catch (err) {
      throw new Error("Error in productAgg upsert:");
    }

    const userPrefFilter: UserPrefFilter = {
      userId: input.userId,
      brandId: input.brandId,
      regionId: input.regionId,
      marketId: input.market,
    };

    if (input.MUUID) {
      userPrefFilter.MUUID = input.MUUID;
    } else if (input.uuid) {
      userPrefFilter.uuid = input.uuid;
    }


    // update if found or insert if not
    input.updatedDate = Math.floor(new Date().getTime() / 1000);


   const userPrefResult = await collection.findOneAndUpdate(
      userPrefFilter,
      { $set: { ...userPrefInput } },
      { upsert: true, returnDocument: "after" }
    );

    userPrefInput.marketId = market;
    
    if (!userPrefResult) {
      throw new Error("Failed to create or update preference");
    }


    // check if request is not comming from identity management then only data should be send to TD from here
    if(!input?.reqFromIdentityManagement){
      const preferences = await getUserFullData(
        input.uuid as string,
        input.brandId,
        input.regionId,
        input.locale
      );

    const lastupdatedate = Math.floor(Date.now() / 1000);

      // Use the mapping function
      const mappedDataWithTD = mapPreferencesToFields({...preferences, lastupdatedate});

      sendDataToTD(mappedDataWithTD);
    }

    if (userPrefResult) {
      const activityColl = await mongoose.connection.collection(userPrefActivityLogCollection);
      const { userId, uuid, updatedBy, ...dataWithoutUuid } = input;
      const activity = {
        uuid,
        data: dataWithoutUuid,
        updatedBy: updatedBy,
        updatedDate: Math.floor(new Date().getTime() / 1000), //get epoch time
        createdDate: Math.floor(new Date().getTime() / 1000) //get epoch time
      }
      activityColl.insertOne(activity);
    }
    const id = userPrefResult._id.toString();
    return id;
  }


  formatDateToDDMMYYYY(date: Date) {
    const day = String(date.getDate()).padStart(2, '0'); // Get day and pad with leading zero if needed
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Get month (0-based) and pad with leading zero
    const year = date.getFullYear(); // Get full year

    return `${month}/${day}/${year}`;
  }

  async deletePreference(uuid: string, brand: string, region: string, market: string): Promise<boolean> {
    const filter: any = { uuid };
    if (brand) filter.brand = brand;
    if (region) filter.region = region;
    if (market) filter.market = market;
    var input = { $set: { isDeleted: true } };
    const collection = await mongoose.connection.collection(userPrefsCollection);
    const result = await collection.findOneAndUpdate({ filter }, input);
    if (!result) {
      return false;
    }
    else {
      return true;
    }
  }

  async permanentDeleteUserData(uuid: string, market: string): Promise<boolean> {
    try {
      const collection = await mongoose.connection.collection(userPrefsCollection);
      const query: any = { uuid };
      if (market) {
        query.market = market;
      }

      const result = await collection.deleteMany(query);

      if (result.deletedCount === 0) {
        throw new Error(`No user data found for UUID: ${uuid}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Error deleting user data: ${error}`);
    }
  }

}
