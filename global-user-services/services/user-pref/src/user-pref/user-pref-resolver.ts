import { UserPrefService } from "./user-pref-service";
import { UserPref, UserPrefInput } from "./user-pref-model";
import { ApolloError } from "apollo-server-express";
import { sendLogToNewRelic } from "../../newRelicLogger";
import { validateBrandAndRegion } from "../utils/shared";

function isValidDate(dateString: string) {
  // Regular expression to check the format mm/dd/yyyy
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(regex);
  if (!match) {
    return false; // Format is incorrect
  }


  // Extract day, month, and year
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Basic checks for month and day
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  // Check for days in each month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Adjust for leap year
  if (month === 2 && isLeapYear(year)) {
    daysInMonth[1] = 29;
  }

  // Validate the day against the maximum days in the month
  return day <= daysInMonth[month - 1];
}
function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export const userPrefResolvers = {
  Query: {
    userPrefs: async (
      _parent: any,
      args: {
        uuid: string;
        brandId: string;
        regionId: string;
        market?: string;
        pgSize?: number;
        pgIndex?: number;
      }
    ) => {
      const srv = new UserPrefService();
      const uuid = args.uuid;
      const brandId = args.brandId;
      const regionId = args.regionId;

      if (!uuid) {
        const logs = [
          {
            message: 'User is not able to get preferences',
            timestamp: Date.now(),
            logtype: 'ERROR',
            service: 'uup-nonpii-pref',
            methodType: 'GET'
          }
        ];
        sendLogToNewRelic(logs);
        throw new Error("uuid is required");
      }


      if (!brandId) {
        throw new Error("brandId is required");
      }
      if (!regionId) {
        throw new Error("regionId is required");
      }

      if (!args.pgIndex) args.pgIndex = 1;
      if (!args.pgSize) args.pgSize = 10;
      const skip = args.pgSize! * (args.pgIndex! - 1);
      const logs = [
        {
          message: 'User is able to get preferences successfully.',
          timestamp: Date.now(),
          logtype: 'INFO',
          service: 'uup-nonpii-pref',
          methodType: 'GET'
        }
      ];
      sendLogToNewRelic(logs);
      return await srv.getPreferences(
        uuid,
        args.brandId,
        args.regionId,
        args.market,
        args.pgSize,
        skip
      );
    },
  },
  Mutation: {
    createOrUpdateUserPref: async (_parent: any, args: any) => {
      const srv = new UserPrefService();

      const pref: UserPref = args.input;

      if (!pref.userId) {
        //Note: userId is  will be either email or phone number must be encrypted, not clearly confirmed yet from Team
        throw new ApolloError("User Id field is required", "BAD_REQUEST", {
          http: { status: 400 },
        });
      }
      if (!pref.brandId) {
        throw new ApolloError("Brand ID is required", "BAD_REQUEST", {
          http: { status: 400 },
        });
      }
      if (!pref.regionId) {
        throw new ApolloError("Region ID is required", "BAD_REQUEST", {
          http: { status: 400 },
        });
      }
       // check if request is not comming from identity management then only data should be send to TD from here
      if(!pref?.reqFromIdentityManagement){
        if (!pref.locale) {
          throw new ApolloError("Locale field is required", "BAD_REQUEST", {
            http: { status: 400 },
          });
        }
      }
      if (!pref.market) {
        throw new ApolloError("Market ID is required", "BAD_REQUEST", {
          http: { status: 400 },
        });
      }
      if (!pref.updatedBy) {
        throw new ApolloError("Updated by field is required", "BAD_REQUEST", {
          http: { status: 400 },
        });
      }
      if (pref.sms && typeof pref.sms != "boolean") {
        throw new ApolloError(
          "sms field must be a valid boolean value: either true or false",
          "BAD_REQUEST",
          { http: { status: 400 } }
        );
      }
      if (pref.advertisingConsent && typeof pref.advertisingConsent != "boolean") {
        pref.advertisingConsent = false
        pref.advertisingConsentDate = srv.formatDateToDDMMYYYY(new Date())
      }
      if (pref.sms && pref.smsDate && !isValidDate(pref.smsDate)) {
        throw new ApolloError(
          "Please send the valid sms date. Date format should be mm/dd/yyyy ",
          "BAD_REQUEST",
          { http: { status: 400 } }
        );
      }

      if (pref.advertisingConsent && pref.advertisingConsentDate && !isValidDate(pref.advertisingConsentDate)) {
        throw new ApolloError(
          "Please send the valid advertising consentDate date. Date format should be mm/dd/yyyy ",
          "BAD_REQUEST",
          { http: { status: 400 } }
        );
      }

    await validateBrandAndRegion(pref);

     var res = await srv.createOrUpdatePreference(pref);
      console.log("registerd id: ", res);

     if (pref.smsDate && !isValidDate(pref.smsDate)) {
        throw new ApolloError(
          "Please enter the valid crendentials for the specific user.",
          "BAD_REQUEST",
          { http: { status: 400 } }
        );
      }

     

      const logs = [
        {
          message: 'User is able to create preferences successfully.',
          timestamp: Date.now(),
          logtype: 'INFO',
          service: 'uup-nonpii-pref',
          createPrefData: res
        }
      ];
      sendLogToNewRelic(logs);
      return res;
    },
    permanentDeleteUserData: async (_parent: any, args: any) => {
      const service = new UserPrefService();
      try {
        const { uuid, market } = args;
        if (!uuid) {
          throw new ApolloError(
            "UUID required for deletion",
            "INPUT_DATA_REQUIRED"
          );
        }
        const logs = [
          {
            message: 'User is able to delete user data successfully.',
            timestamp: Date.now(),
            logtype: 'INFO',
            service: 'uup-nonpii-pref',
            userIdData: uuid
          }
        ];
        sendLogToNewRelic(logs);
        const result = await service.permanentDeleteUserData(uuid, market);
        if (!result) {
          throw new ApolloError("Delete unsuccessful", "FAILED_TO_DELETE");
        }
        return `User with uuid: ${uuid} permanently deleted from database`;
      } catch (error) {
        const logs = [
          {
            message: 'User is not able to delete user data',
            timestamp: Date.now(),
            logtype: 'ERROR',
            service: 'uup-nonpii-pref',
          }
        ];
        sendLogToNewRelic(logs);
        throw new ApolloError("Delete unsuccessful", "INTERNAL_SERVER_ERROR");
      }
    }
  }
};

// function validateUpdateOrDelParams(
//   uuid: string,
//   brand: string,
//   region: string,
//   market: string
// ) {
//   if (!uuid) {
//     throw new Error("uuid is required");
//   }
//   if (!brand) {
//     throw new Error("brand is required");
//   }
//   if (!region) {
//     throw new Error("region is required");
//   }
//   if (!market) {
//     throw new Error("market is required");
//   }
// }
