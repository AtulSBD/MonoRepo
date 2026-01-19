  import { Request, Response } from "express";
  import axios from "axios";
  import { handleApiError } from "../Utils/errorHandler";
  import { errorResponse, successResponse } from "../Utils/responseWrapper";
  import { registerWithTD, sendNonPIIData } from "../services/auth.service";
  import UserResponse from "../models/UserResponse.model";
  import { APP_IDS, fetchAicUserData, fetchUserDetailsFromAicApi, formatDateToTD, getMarketIdByLanguage, validateBrandAndRegion } from "../Utils/shared";

  import * as config from "../env";
  import { getuserData, userService } from "../services/user.service";
  import { getConfig } from "../services/config.service";
  import { User } from "../models/UserMuuid.model";
  import { UserProductAgg } from "../models/UserMuuid.model";
  import { UserPref } from "../models/UserMuuid.model";
  import { UserRegisteredProduct } from "../models/UserMuuid.model";
  import { sendLogToNewRelic } from "../Utils/newRelicLogger";
  import { validateEmail } from "../Utils/changeEmailUtil"
  import { getUserByUUID } from "../Utils/userMuuid";
  import { sendFullUserDataToTD } from "../Utils/sendAllDataTD";


  export class userController {
    async getUserData(req: Request, res: Response): Promise<any> {
      try {
        const attributes = req.query.attributes as string | undefined;

        const { id, brandId, regionId,locale } = req.body;
        await validateBrandAndRegion({ brand: brandId, region: regionId });
        if (!locale) {
        return res.status(400).json({statusCode: "400",message:"missing arguments locale",errorCode: "missing_argument"});
      }
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
            uuid: id,
            type_name: `${configData.entity}`,
            attributes: attributes,
          },
          auth,
        });

        //res.status(200).json(data);
        if (response.data?.stat === "error") {
          const code = response.data.code === 200 ? 400 : 404;
          const apiError = handleApiError(
            { response },
            "Failed to fetch user data",
            code
          );
          return res.status(code).json(apiError);
        }
        const user = new UserResponse(response.data.result);

        const { demographic, ...userWithoutDemographic } = user;


        const userPrefs = await UserPref.aggregate([
          { $match: { uuid: id, brandId: brandId, regionId: regionId } },
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
              email: "$userId",
              MUUID: "$MUUID",
              uuid: "$productAggData.uuid",
              tool_usage: "$productAggData.tool_usage",
              company: "$productAggData.company",
              brandId: "$brandId",
              regionId: "$regionId",
              market: "$market",
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
              clientId: "$clientId"
          }
        }
      ]);

        if (userPrefs.length <= 0) {
          return res
            .status(400)
            .json(
              errorResponse(
                "Records not found",
                400,
                "Records not found with given details"
              )
            );
        }

      
        const firstPref = userPrefs[0];
      
        const rootFields = {
          ...userWithoutDemographic, // AIC profile fields first
          uuid: firstPref?.uuid,
          MUUID: firstPref?.MUUID,
          brandId: firstPref?.brandId,
          regionId: firstPref?.regionId,
          userId: firstPref?.userId,
          tool_usage: firstPref?.tool_usage,
          myInterests: firstPref?.myInterests,
          role: firstPref?.jobRoleORFunction,
          demographic: {
            trade: Array.isArray(firstPref?.demographicTrades) ? firstPref.demographicTrades : []
          },
        };


        
        // Build arrayFields with merged data
        const arrayFields = userPrefs.map(pref => {
          const { uuid, MUUID, brandId, regionId, userId, tool_usage, email, myInterests, jobRoleORFunction, demographicTrades, ...rest } = pref;
          return rest;
        });

        const responseData = {
          ...rootFields,
          userMarketPrefrences: arrayFields
        };

        /********************************* NewRelic Log Capture :: starts ************************************/
        const logs = [
          {
            message: "User Data received successfully.",
            timestamp: Date.now(),
            logtype: "INFO",
            service: "uup",
            responseData: user,
          },
        ];
        sendLogToNewRelic(logs);
        /********************************* NewRelic Log Capture :: ends *************************************/
        return res.status(200).json(successResponse("User data", responseData));
      } catch (error) {
        /********************************* NewRelic Log Capture :: starts ************************************/
        const logs = [
          {
            message: "Failed to fetch user data",
            timestamp: Date.now(),
            logtype: "ERROR",
            service: "uup",
            statusCode: 400,
          },
        ];
        sendLogToNewRelic(logs);
        /********************************* NewRelic Log Capture :: ends *************************************/
        const ApiError = handleApiError(
          { error },
          "Failed to fetch user data",
          400
        );
        return res.status(400).json(ApiError);
      }
    }
    // Update user data
    async updateUserData(req: Request, res: Response): Promise<any> {
      try {
        const { id, brandId, regionId, accessToken, locale, ...userData } = req.body;

        const brand = brandId.toUpperCase();
        const region = regionId.toUpperCase();
        await validateBrandAndRegion({ brand, region });

        if (!userData || Object.keys(userData).length === 0) {
          res.status(400).send({ message: "No user data provided for update" });
          return;
        }

        const updateUser = await userService(userData, id, brandId, regionId, accessToken, locale);
        if (updateUser.errorCode) {
          return res.status(400).json(updateUser);
        }
        const data = req.body;
        data.uuid = id;
        const user = await getUserByUUID(id);
        const { givenName, familyName } = await getuserData(id, brand, region,locale)
        if (user) {
          data.muuid = user.muuid;
          data.email = user.email
        }
        data.givenName = givenName
        data.familyName = familyName
        data.updatedDate = new Date();
        data.region = region
        data.brand = brand
        data.market = req.body.locale.split("-")[1].toUpperCase();
        const userPrefData = await UserPref.findOne({uuid: id, MUUID: data.muuid });


        const fullUserPrefData = {
          ...userPrefData?.toObject(),
          ...data        
        }
        fullUserPrefData.demographic = fullUserPrefData.demographic || {};
        fullUserPrefData.demographic.trade = fullUserPrefData?.demographicTrades
        sendNonPIIData(fullUserPrefData);
        sendFullUserDataToTD(id, brandId, regionId, data);
        {
          /********************************* NewRelic Log Capture :: starts ************************************/
          const logs = [
            {
              message: "User data updated successfully",
              timestamp: Date.now(),
              logtype: "ERROR",
              service: "uup",
              updateUserData: updateUser,
            },
          ];
          sendLogToNewRelic(logs);
          /********************************* NewRelic Log Capture :: ends *************************************/
          return res
            .status(200)
            .json(successResponse("User data updated successfully", updateUser));
        }
      } catch (error) {
        const apiError = handleApiError(
          { error },
          "Failed to update user data",
          400
        );
        /********************************* NewRelic Log Capture :: starts ************************************/
        const logs = [
          {
            message: "Failed to update user",
            timestamp: Date.now(),
            logtype: "ERROR",
            service: "uup",
            errorCode: apiError,
          },
        ];
        sendLogToNewRelic(logs);
        /********************************* NewRelic Log Capture :: ends *************************************/
        return res.status(400).json(apiError);
      }
    }

    // Handler to get user data by muuid, with optional brandId and regionId
    async getUserByMuuid(req: Request, res: Response): Promise<any> {
      try {
        // Define the allowed keys in the request body
        const allowedKeys: string[] = ['muuid', 'brandId', 'regionId', 'locale'];
        const requestKeys = Object.keys(req.body);
        
        // Check if there are any unexpected keys in the request body
        const hasUnexpectedKeys: boolean = requestKeys.some(key => !allowedKeys.includes(key));

        // If unexpected keys are found, return a 400 Bad Request error
        if (hasUnexpectedKeys) {
          return res.status(400).json({
            status: 400,
            message: 'Invalid combination of fields. Allowed fields: muuid, brandId, regionId, locale.',
            error: "BAD_REQUEST"
          });
        }

        let { muuid, brandId, regionId, locale } = req.body;

        // Check that muuid and locale are present
        if (!muuid || !locale) {
          return res.status(400).json({
            status: 400,
            message: 'muuid and locale are required fields.',
            error: "BAD_REQUEST"
          });
        }

        // Check valid combinations
        const onlyMuuidPresent = muuid && locale && !brandId && !regionId;
        const allFieldsPresent = muuid && brandId && regionId && locale;

        if (!(onlyMuuidPresent || allFieldsPresent)) {
            return res.status(400).json({
              status: 400,
              message: 'Invalid combination of fields. Either provide only muuid and locale, or all of muuid, brandId, regionId, and locale.',
              error: "BAD_REQUEST"
            });
          }

        // Proceed only if the request has a valid combination of fields
        if (onlyMuuidPresent || allFieldsPresent) {

          // Find the user by muuid
          const user = await User.findOne({ MUUID: muuid });
          if (!user) return res.status(404).json({ status: 404, message: "User not found with given muuid" });

          // Case 1: Only muuid is provided
          if (onlyMuuidPresent) {

           const userProductAggs = await UserProductAgg.find({ MUUID: muuid });
            if (!userProductAggs || userProductAggs.length === 0) {
              return res.status(404).json({ status: 404, message: "User not found for given muuid in userProductdAgg" });
            }

            const aicUserData = await fetchAicUserData(userProductAggs, locale);


            // Get UserPref documentsfor a given  MUUID, excluding MUUID and uuid fields.
            const userPrefs = await UserPref.find({ MUUID: muuid }, { MUUID: 0 });
            if (!userPrefs) return res.status(404).json({ status: 404, message: "User not found with given muuid in UserPrefs" });

            // Get registered products for the first uuid (may need adjustment if multiple uuids)
            const userProducts = await UserRegisteredProduct.aggregate([
              { $match: { muuid } },
              {
                $group: {
                  _id: { brandId: "$brandId" },
                  doc: { $first: "$$ROOT" }
                }
              },
              { $replaceRoot: { newRoot: "$doc" } },
              { $project: { muuid: 0, uuid: 0 } } // Exclude muuid and uuid fields
            ]);

            // Prepare the result object to return
            const result = {
              MUUID: muuid,
              locale,
              piData: aicUserData,
              preferences: userPrefs,
              registeredProducts: userProducts
            };
            // Send the result as JSON response
            return res.json(result);
          }

          // Case 2: All fields (muuid, brandId, regionId) are provided
          if (allFieldsPresent) {
            // Convert brandId and regionId to uppercase for consistency
            brandId = brandId.toUpperCase();
            regionId = regionId.toUpperCase();

            const userProductAggs = await UserProductAgg.find({ MUUID: muuid, brandId, regionId });
            if (!userProductAggs || userProductAggs.length === 0) {
              return res.status(404).json({ status: 404, message: "User not found for given muuid in userProductdAgg" });
            }

            const aicUserData = await fetchAicUserData(userProductAggs, locale);

            // Validate the brand and region combination (custom function)
            await validateBrandAndRegion({ brand: brandId, region: regionId });

              // Find all preferences for this uuid, brandId, and regionId
            const userPrefs = await UserPref.find({
              MUUID: muuid, brandId, regionId
            }, { MUUID: 0 });
            if (!userPrefs || userPrefs.length === 0) return res.status(404).json({ status: 404, message: "User not found with given muuid/brandId/regionId" });



            // Find all registered products for this uuid, brandId, and regionId
            const userProducts = await UserRegisteredProduct.find({
              muuid,
              brandId,
              regionId
            }, { muuid: 0, uuid: 0 });

            // Prepare and send the result as JSON response
            return res.json({
              MUUID: muuid,
              locale,
              piData: aicUserData,
              preferences: userPrefs,
              registeredProducts: userProducts
            });
          }
        } else {
          return res.status(400).json({
            status: 400,
            message: 'Invalid combination of fields. Either provide only muuid or all of muuid, brandId and regionId',
            error: "BAD_REQUEST"
          });
        }
      } catch (error) {
        const apiError = handleApiError({ error }, "Something went wrong while getting user data", 500);
        return res.status(500).json(apiError);
      }
    }
    // Handler to update user data by muuid, brandId, and regionId
    async updateUserDataByMuuid(req: Request, res: Response): Promise<any> {
      try {

        let { muuid, brandId, regionId, accessToken, locale, ...userData } = req.body;

        brandId = brandId.toUpperCase();
        regionId = regionId.toUpperCase();
        // Validate the brand and region combination (custom function)
        await validateBrandAndRegion({ brand: brandId, region: regionId });

        // Check if there is any user data to update
        if (!userData || Object.keys(userData).length === 0) {
          res.status(400).send({ message: "No user data provided for update" });
          return;
        }

        // Find the UserPref document by muuid
        const userPrefs = await UserPref.findOne({ MUUID: muuid, brandId, regionId });
        if (!userPrefs?.uuid) return res.status(404).json({ status: 404, message: "User not found with given muuid/brandId/regionId" });

        // Call userService to process the update
        const updateUser = await userService(userData, userPrefs.uuid, brandId, regionId, accessToken, locale);
        if (updateUser.errorCode) {
          return res.status(400).json(updateUser);
        }

        
        // Update the UserPref document where uuid, brandId, and regionId match
        const updatedPref = await UserPref.findOneAndUpdate(
          { MUUID: muuid, brandId, regionId },             // just the ID
          { $set: userData },
          { new: true }
        );

        // If update failed, return a 500 error
        if (!updatedPref) {
          return res.status(500).json({ status: 404, message: "Someting went wrong while updating userPrefs" });
        }

        // Register the update with TD (tracking/analytics system)
        const data = req.body;
        data.market = req.body.locale.split("-")[1].toUpperCase();
        data.uuid = userPrefs.uuid;
        const user = await getUserByUUID(userPrefs.uuid);
        const { givenName, familyName } = await getuserData(userPrefs.uuid, brandId, regionId,locale)
        if (user) {
          data.muuid = user.muuid;
          data.email = user.email
        }
        data.givenName = givenName
        data.familyName = familyName
        data.updatedDate = new Date();
        data.region = regionId;
        data.brand = brandId;


        const fullUserPrefData = {
          ...userPrefs?.toObject(),
          ...data        
        }
        fullUserPrefData.demographic = fullUserPrefData.demographic || {};
        fullUserPrefData.demographic.trade = fullUserPrefData?.demographicTrades
        sendNonPIIData(fullUserPrefData);
        sendFullUserDataToTD(userPrefs?.uuid, brandId, regionId, fullUserPrefData);


        // Log the successful update to NewRelic
        {
          /********************************* NewRelic Log Capture :: starts ************************************/
          const logs = [
            {
              message: "User data updated successfully",
              timestamp: Date.now(),
              logtype: "SUCCESS",
              service: "uup",
              updateUserData: updateUser,
            },
          ];
          sendLogToNewRelic(logs);
          /********************************* NewRelic Log Capture :: ends *************************************/
          return res
            .status(200)
            .json(successResponse("User data updated successfully", updateUser));
        }
      } catch (error) {
        const apiError = handleApiError(
          { error },
          "Failed to update user data",
          400
        );
        // Log the error to NewRelic
        /********************************* NewRelic Log Capture :: starts ************************************/
        const logs = [
          {
            message: "Failed to update user",
            timestamp: Date.now(),
            logtype: "ERROR",
            service: "uup",
            errorCode: apiError,
          },
        ];
        sendLogToNewRelic(logs);
        /********************************* NewRelic Log Capture :: ends *************************************/
        return res.status(400).json(apiError);
      }
    }

    async getUserDetails(req: Request, res: Response): Promise<any> {
      const { email,locale } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ statusCode: "400", message: "Email is required" });
      }
        if (!locale) {
        return res.status(400).json({statusCode: "400",message:"missing arguments locale",errorCode: "missing_argument"});
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ statusCode: "400", message: 'Invalid email format' });

      }
      try {
        const user = await User.findOne({ userId: email });

        if (!user) {
          return res.status(404).json({ statusCode: "404", message: "User not found" });
        }

        const userAggRecords = await UserProductAgg.find({ MUUID: user.MUUID });

        const userData = await Promise.all(
          userAggRecords.map(async (record: any) => {
            const extUserData = await fetchUserDetailsFromAicApi(
              record?.uuid,
              record.brandId.toUpperCase(),
              record.regionId.toUpperCase(),
              locale
            );

            if (!extUserData) return null;

            return {
              uuid: record.uuid,
              brandId: record.brandId,
              regionId: record.regionId,
              firstName: extUserData.givenName,
              lastName: extUserData.familyName,
              emailVerified: extUserData.emailVerified,
              source: extUserData.source,
              websiteMemberAccountType: extUserData.websiteMemberAccountType,
              websiteRegistrationDate: extUserData.websiteRegistrationDate,
              isMigrated: isMigrated(extUserData.migratedDate)
            };
          })
        );
        function isMigrated(value: any): boolean {
          if (!value) return false;
          const date = new Date(value);
          return !isNaN(date.getTime());
        }
        return res.status(200).json({
          statusCode: "200",
          message: "User data",
          // email,
          userData: userData.filter(Boolean),
        });
      } catch (err) {
        return res.status(500).json({ statusCode: "500", message: "Internal server error" });
      }
    }
    // ALL FUNCTION MUST BE INSIDE THIS CLASS
  }