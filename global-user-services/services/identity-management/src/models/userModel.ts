  export interface IPrimaryAddress {
    phone: string;
    address1: string;
    address2: string;
    city: string;
    zip: string;
    country: string;
    company: string;
    stateAbbreviation: string;
}


export interface IDemographic {
  preferredLanguage: string;
  employmentStatus: string;
  trade: Array<string>;
  company: string
}
  export interface IUser {
    uuid: string;
    MUUID:string;
    givenName: string;
    familyName: string;
    emailAddress: string;
    email: string;
    region: string;
    brand: string;
    market: string;
    primaryAddress: IPrimaryAddress;
    gender: string;
    birthday: string;
    displayName: string;
    newPassword: string;
    newPasswordConfirm: string;
    redirect_uri: string;
    lastLogin: string;
    lastLoginDate: string;
    neo_aicuuid: string;
    language: string;
    company: string;
    demographic: IDemographic;
    tool_usage: Array<string>;
    islegacy: boolean;
    ismigrated: boolean
    optInProductResearch: boolean;
    optInProductResearchDate: string;
    optOutProductResearchDate: string;
    optInNewsletters: boolean;
    optInNewslettersDate: string;
    optOutNewslettersDate: string;
    optinConfirmationDate: string;
    newsletterURL: string;
    projects: Array<string>;
    accountstatus: string;
    myInterests: Array<string>;
    myExpertise: string;
    advertisingConsent: boolean;
    advertisingConsentDate: string
    emailConsent: boolean;
    sms: boolean;
    smsDate: string;
    myStores: Array<string>;
    typeOfConstructionWork: string;
    experienceLevel: Array<string>;
    jobRoleORFunction: Array<string>;
    purchaseLocations: Array<string>;
    myYardSize: string;
    myDrivewaySize: string;
    howToServiceEquipment: string;
    purchaseEquipementSelfOrBusiness : boolean;
    source: string;
    locale: string;
    preferencesMigrationStatus: string;
    productsMigrationStatus: string;
    profileMigrationStatus: string;
    createdAt: number
    updatedAt: number
    createdDate: string
    updatedDate: string
    createNewFields: boolean,
    websiteMemberAccountType: string;
    lastupdateddate: number;
    emailverified: string;
    globalId: string;
    clientId: string;
    pageurl: string;
    professionalUser: boolean;
    preferred_language?: string;
    reqFromIdentityManagement?: boolean;
    marketName?: string;
    locale_code?: string;
  }
