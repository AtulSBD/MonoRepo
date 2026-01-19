import { gql } from "apollo-server-express";


export const UserPrefTypeDefs = gql`
  type UserPref {
    id: ID
    uuid: String
    brandId: String
    regionId: String
    market: String
    marketId: String
    phone: String
    address: String
    advertisingConsent: Boolean
    advertisingConsentDate: String
    optInNewsletters: Boolean
    optOutNewslettersDate: String
    source: String
    demographicemploymentStatus: String
    optinConfirmDate: String
    optInProductResearch: Boolean
    optInProductResearchDate: String
    optOutProductResearchDate: String
    optInAllowSurvey: Boolean
    ooptInAllowSurveyDate: String
    optOutAllowSurveyDate: String
    optInNewsletterDate: String
    productsMigrationStatus: String
    profileMigrationStatus: String
    projects: [String]
    accountStatus: String
    myInterests: [String]
    myExpertise: String
    demographicTrades: [String]
    myStores: [String]
    typeOfConstructionWorks: [String]
    experiencelevel: [String]
    jobRoleORFunction: [String]
    purchaseLocations: [String]
    myYardSize: String
    myDrivewaySize: String
    howToServiceEquipment: String
    isSelfOrBusinessUse: Boolean
    websiteMemberAccountType: String
    MUUID:String
    sms: Boolean
    smsDate: String
    countryOfResidence: String
    updatedBy:String
    globalId: String
    clientId: String
    professionalUser: Boolean
    tool_usage: [String]
    updatedDate: String
    shop: String
    retailers: [String]
  }

  

 type PreferencesResponse {
  uuid: String
  MUUID: String
  userId: String
  brandId: String
  regionId: String
  tool_usage: [String]
  myInterests: [String]
  role: [String]
  demographic: Demographic
  userMarketPrefrences: [UserPref!]!
}

type Demographic {
  trade: [String]
}

  type Query {
    userPrefs(uuid: String!, brandId:String, regionId:String, market:String) : PreferencesResponse
  }
   type Mutation {
    createOrUpdateUserPref(input: UserPrefInput): ID
    # updateUserPref(uuid: String!, brandId:String!, regionId:String!, market:String!,  input: UserPrefInput): UserPref
    # deleteUserPref(uuid: String!, brandId:String!, regionId:String!, market:String!): Boolean
    permanentDeleteUserData(uuid: String!, market: String): String
  }

  input UserPrefInput {
    id: ID
    userId: String
    uuid: String
    brandId: String
    regionId: String
    market: String
    phone: String
    address: String
    advertisingConsent: Boolean
    advertisingConsentDate: String
    optInNewsletters: Boolean
    optOutNewslettersDate: String
    source: String
    updatedBy: String!
    demographicemploymentStatus: String
    optinConfirmDate: String
    optInProductResearch: Boolean
    optInProductResearchDate: String
    optOutProductResearchDate: String
    optInAllowSurvey: Boolean
    ooptInAllowSurveyDate: String
    optOutAllowSurveyDate: String
    optInNewsletterDate: String
    productsMigrationStatus: String
    profileMigrationStatus: String
    projects: [String]
    accountStatus: String
    myInterests: [String]
    myExpertise: String
    demographicTrades: [String]
    myStores: [String]
    typeOfConstructionWorks: [String]
    experiencelevel: [String]
    jobRoleORFunction: [String]
    purchaseLocations: [String]
    myYardSize: String
    myDrivewaySize: String
    howToServiceEquipment: String
    isSelfOrBusinessUse: Boolean
    isDeleted: Boolean
    websiteMemberAccountType: String
    MUUID:String
    sms: Boolean
    smsDate: String
    countryOfResidence: String
    globalId: String
    clientId: String
    professionalUser: Boolean
    tool_usage: [String]
    preferredLanguage: String
    shop: String
    retailers: [String]
    reqFromIdentityManagement: Boolean
    language: String
    company: String
    locale: String
  } 
`;
 