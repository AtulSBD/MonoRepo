import { User } from "../models/UserMuuid.model";
import { registerWithTD } from "../services/auth.service";
import { getUserDetailsFromAIC, normalizeAICUser } from "../Utils/shared";
import { sendLogToNewRelic } from './newRelicLogger';


// 2. Main function to send all user data to TD
export async function sendFullUserDataToTD(
  uuid: string,
  brandId: string,
  regionId: string,
  reqBody: any // Pass req.body here
) {
  
  try {
    // Fetch PI data from AIC
    const piData = await getUserDetailsFromAIC(uuid, brandId, regionId,reqBody.locale);
    if (!piData) {
      console.error('PI data not found for', { uuid, brandId, regionId });
      return;
    }
   
    const email = piData.userpi.email;
    // Fetch non-PI data from MongoDB

    const userPrefs = await User.aggregate([
      {
        $match: { userId: email } // Replace with actual userId
      },
      {
        $lookup: {
          from: "userProductAgg",
          let: {
            muuid: "$MUUID",
            brandId: brandId,
            regionId: regionId
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$MUUID", "$$muuid"] },
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

      {
        $unwind: {
          path: "$productAggData",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "userPref",
          let: {
            muuid: "$MUUID",
            brandId: brandId,
            regionId: regionId
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$MUUID", "$$muuid"] },
                    { $eq: ["$brandId", "$$brandId"] },
                    { $eq: ["$regionId", "$$regionId"] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: "prefData"
        }
      },

      {
        $unwind: {
          path: "$prefData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          email: email,
          MUUID: 1,
          uuid: "$productAggData.uuid",
          tool_usage: "$productAggData.tool_usage",
          company: "$productAggData.company",
          brandId: "$prefData.brandId",
          regionId: "$prefData.regionId",
          market: "$prefData.marketId",
          phone: "$prefData.phone",
          countryOfResidence: "$prefData.countryOfResidence",
          optInNewsletters: "$prefData.optInNewsletters",
          optOutNewslettersDate: "$prefData.optOutNewslettersDate",
          source: "$prefData.source",
          demographicemploymentStatus: "$prefData.demographicemploymentStatus",
          optinConfirmDate: "$prefData.optinConfirmDate",
          optInProductResearch: "$prefData.optInProductResearch",
          optInProductResearchDate: "$prefData.optInProductResearchDate",
          optOutProductResearchDate: "$prefData.optOutProductResearchDate",
          optInNewsletterDate: "$prefData.optInNewsletterDate",
          projects: "$prefData.projects",
          accountStatus: "$prefData.accountStatus",
          myInterests: "$prefData.myInterests",
          myExpertise: "$prefData.myExpertise",
          sms: "$prefData.sms",
          smsDate: "$prefData.smsDate",
          demographicTrades: "$prefData.demographicTrades",
          myStores: "$prefData.myStores",
          typeOfConstructionWorks: "$prefData.typeOfConstructionWorks",
          experiencelevel: "$prefData.experiencelevel",
          jobRoleORFunction: "$prefData.jobRoleORFunction",
          purchaseLocations: "$prefData.purchaseLocations",
          myYardSize: "$prefData.myYardSize",
          myDrivewaySize: "$prefData.myDrivewaySize",
          howToServiceEquipment: "$prefData.howToServiceEquipment",
          isSelfOrBusinessUse: "$prefData.isSelfOrBusinessUse",
          updatedBy: "$prefData.updatedBy",
          websiteMemberAccountType: "$prefData.websiteMemberAccountType",
          advertisingConsent: "$prefData.advertisingConsent",
          advertisingConsentDate: "$prefData.advertisingConsentDate",
          globalId: "$prefData.globalId",
          clientId: "$prefData.clientId"
        }
      }

    ]);
      
    if (userPrefs.length <= 0) {
      console.error('UserPref not found for', { email, brandId, regionId });
      return;
    }

const aicNormalized = normalizeAICUser(piData.userpi);

    // Merge all data for UserTD, including req.body
    const fullData = {
    //  ...piData.userpi,
      ...aicNormalized,
      ...userPrefs[0],
      ...reqBody,
      uuid: uuid,
      emailverified: piData.userpi.emailVerified,
      brand: brandId.toUpperCase(),
      region: regionId.toUpperCase(),
    };
    fullData.demographic.trade = fullData.demographicTrades
    
    fullData.optInNewslettersDate = fullData.optInNewsletterDate
    fullData.optinConfirmationDate = fullData.optinConfirmDate
    fullData.created=piData.createdDate
    fullData.createdDate=piData.createdDate
    fullData.updatedDate=fullData.lastUpdated 
    fullData.lastLogin=piData.lastLogin
    fullData.lastLoginDate=piData.lastLogin
    fullData.demographic.employmentStatus=userPrefs[0]?.demographicemploymentStatus;
    // Send to TD                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
    await registerWithTD(fullData, 'signup');
  } catch (err) {
    // NewRelic log for success
            sendLogToNewRelic([{
                message: `Error while sending email verified status data to TD: ${(err as any).message}`,
                timestamp: Date.now(),
                logtype: "ERROR",
                service: "uup",
                endpoint: "sendFullUserDataToTD",
                uuid: uuid,
                brandId: brandId,
                regionId: regionId
              
            }]);
    if (err instanceof Error) {
      console.error('Failed to send full user data to TD:', err.stack || err.message);
    } else {
      console.error('Failed to send full user data to TD:', err);
    }
  }
}