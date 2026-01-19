import { IUser } from "./userModel";

export class UserPref {
    userId: String  
    uuid: string;
    MUUID: string;
    brandId: string;
    regionId: string;
    market: string;
    phone: string;
    optInNewsletters: boolean;
    optOutNewslettersDate: string;
    source: string;
    demographicemploymentStatus: string;
    optinConfirmDate: string;
    optInProductResearch: boolean;
    optInProductResearchDate: string;
    optOutProductResearchDate: string;
    optInNewsletterDate: string;
    productsMigrationStatus: string;
    profileMigrationStatus: string;
    projects: Array<string>;
    accountStatus: string;
    myInterests: Array<string>;
    myExpertise: string;
    sms: boolean;
    smsDate: string;
    demographicTrades: Array<string>;
    myStores: Array<string>;
    typeOfConstructionWorks: string;
    experiencelevel: Array<string>;
    jobRoleORFunction: Array<string>;
    purchaseLocations: Array<string>;
    myYardSize: string;
    myDrivewaySize: string;
    howToServiceEquipment: string;
    isSelfOrBusinessUse: boolean;
    updatedBy: string;
    websiteMemberAccountType: string
    advertisingConsent: boolean;
    advertisingConsentDate: string
    countryOfResidence: string;
    globalId: string;
    clientId: string;
    tool_usage: Array<string>;
    professionalUser: boolean;
    preferredLanguage?: string;
    reqFromIdentityManagement?: boolean;
    constructor(data: IUser) {
        this.userId = data.emailAddress || data.email || (data.primaryAddress ? data.primaryAddress.phone : "");
        this.uuid = data.uuid;
        this.MUUID = data.MUUID;
        this.brandId = data.brand;
        this.regionId = data.region;
        this.market = data.market;
        this.phone = data.primaryAddress ? data.primaryAddress.phone : "";
        this.countryOfResidence = data.primaryAddress ? data.primaryAddress.country : "";
        this.optInNewsletters = data.optInNewsletters || data.emailConsent;
        this.optOutNewslettersDate = data.optOutNewslettersDate;
        this.source = data.source;
        this.demographicemploymentStatus = data.demographic ? data.demographic.employmentStatus : "";
        this.preferredLanguage = data.language ? data.language : "";
        this.optinConfirmDate = data.optinConfirmationDate;
        this.optInProductResearch = data.optInProductResearch;
        this.optInProductResearchDate = data.optInProductResearchDate;
        this.optOutProductResearchDate = data.optOutProductResearchDate;
        this.optInNewsletterDate = data.optInNewslettersDate;
        this.productsMigrationStatus = data.productsMigrationStatus;
        this.profileMigrationStatus = data.profileMigrationStatus;
        this.projects = data.projects;
        this.accountStatus = data.accountstatus;
        this.myInterests = data.myInterests;
        this.myExpertise = data.myExpertise as string;
        this.sms = data.sms;
        this.smsDate = data.smsDate;
        
        this.demographicTrades = data.demographic ? data.demographic.trade : [];
        this.myStores = data.myStores;
        this.typeOfConstructionWorks = data.typeOfConstructionWork;
        this.experiencelevel = data.experienceLevel;
        this.jobRoleORFunction = data.jobRoleORFunction;
        this.purchaseLocations = data.purchaseLocations;
        this.myYardSize = data.myYardSize;
        this.myDrivewaySize = data.myDrivewaySize;
        this.howToServiceEquipment = data.howToServiceEquipment;
        this.isSelfOrBusinessUse = data.purchaseEquipementSelfOrBusiness;
        this.updatedBy = `${data.givenName} ${data.familyName}`
        this.websiteMemberAccountType = data.websiteMemberAccountType
        this.advertisingConsent = data.advertisingConsent;
        this.advertisingConsentDate = data.advertisingConsentDate;
        this.globalId = data.globalId;
        this.clientId = data.clientId;
        this.tool_usage = data.tool_usage;
        this.professionalUser = data.professionalUser;
        this.reqFromIdentityManagement = data.reqFromIdentityManagement;
    }

    formatDateToDDMMYYYY(date: Date) {
        const day = String(date.getDate()).padStart(2, '0'); // Get day and pad with leading zero if needed
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Get month (0-based) and pad with leading zero
        const year = date.getFullYear(); // Get full year
    
        return `${month}/${day}/${year}`;
    }
}