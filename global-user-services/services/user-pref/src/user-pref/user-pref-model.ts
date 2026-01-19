import { ObjectId } from "mongodb";

export interface UserPrefInput {
    userId: string;  
    uuid: string;
    brand: string;
    region: string;
    market: string;
    phone: string;
    address: string;
    optInNewsletters: boolean;
    optOutNewslettersDate: string;
    source: string;
    demographicemploymentStatus: string;
    optinConfirmDate: string;
    optInProductResearch: boolean;
    optInProductResearchDate: string;
    optOutProductResearchDate: string;
    optInAllowSurvey: boolean;
    ooptInAllowSurveyDate: string;
    optOutAllowSurveyDate: string;
    optInNewsletterDate: string;
    productsMigrationStatus: string;
    profileMigrationStatus: string;
    projects: string[];
    accountStatus: string;
    myInterests: string[];
    myExpertise: string;
    demographicTrades: string[];
    myStores: string[];
    typeOfConstructionWorks: string[];
    experiencelevel: string;
    jobRoleORFunction: string;
    purchaseLocations: string[];
    myYardSize: string;
    myDrivewaySize: string;
    howToServiceEquipment: string;
    isSelfOrBusinessUse: boolean;
    isDelted:boolean;
    websiteMemberAccountType: string;
    updatedBy: string;
    updatedDate: number;
    MUUID:string;
    globalId: string;
    clientId: string;
    professionalUser: boolean;
    preferredLanguage?: string;
    shop: string;
    retailers: string[];
    reqFromIdentityManagement?: boolean;
  }

  export interface UserPref {
    id?: ObjectId;
    userId?: string;
    uuid?: string;
    brandId: string;
    regionId: string;
    market: string;
    marketId?: string;
    phone: string;
    address: string;
    advertisingConsent: boolean
    advertisingConsentDate: string
    optInNewsletters: boolean;
    optOutNewslettersDate: string;
    source: string;
    updatedBy: string;
    updatedDate: number;
    demographicemploymentStatus: string;
    optinConfirmDate: string;
    optInProductResearch: boolean;
    optInProductResearchDate: string;
    optOutProductResearchDate: string;
    optInAllowSurvey: boolean;
    ooptInAllowSurveyDate: string;
    optOutAllowSurveyDate: string;
    optInNewsletterDate: string;
    productsMigrationStatus: string;
    profileMigrationStatus: string;
    projects: string[];
    accountStatus: string;
    myInterests: string[];
    myExpertise: string;
    demographicTrades: string[];
    myStores: string[];
    typeOfConstructionWorks: string[];
    experiencelevel: string[];
    jobRoleORFunction: string[];
    purchaseLocations: string[];
    myYardSize: string;
    myDrivewaySize: string;
    howToServiceEquipment: string;
    isSelfOrBusinessUse: boolean;
    isDelted:boolean;
    websiteMemberAccountType: string;
    MUUID:string;
    sms: boolean
    smsDate: string
    countryOfResidence: string
    professionalUser: boolean
    tool_usage?: string[];
    company?: string;
    shop: string;
    retailers: string[];
    reqFromIdentityManagement?: boolean;
    locale: string;
  }


export type PreferencesResponse = {
  uuid: string;
  MUUID: string;
  userId: string;
  brandId: string;
  regionId: string;
  tool_usage: string[];
  myInterests?: string[];
  role?: string[];              
  demographic?: {
    trade?: string[];
  };
  userMarketPrefrences: { [key: string]: any }[];
};

export type Region = {
  _id: string;
};
export interface UserPrefInfo {
  uuid?: string;
  MUUID?: string;
  brandId?: string;
  regionId?: string;
  userId?: string;
  tool_usage?: any; 
  myInterests?: any; 
  jobRoleORFunction?: any; 
  demographicTrades?: any; 
  [key: string]: any; 
}

export interface UserPrefFilter {
  userId?: string;
  brandId?: string;
  regionId?: string;
  marketId?: string;
  MUUID?: string; 
  uuid?: string;
}