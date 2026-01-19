import { dateToEpochTD } from "../Utils/shared";
import { IPrimaryAddress, IUser } from "./userModel";
  export class UserTD {
    static mockImplementation(arg0: () => { region: string; }) {
        throw new Error('Method not implemented.');
    }
    email: string;
    aic_uuid: string;
    emailverified: string;
    brand: string;
    region: string;
    market: string;
    muuid: string;
    givenname: string;
    familyname: string;
    primaryaddress: IPrimaryAddress;
    created: string;
    createddate: string;
    lastlogin: string;
    lastlogindate: string;
    lastupdateddate: string;
    islegacy: boolean;
    ismigrated: boolean;
    preferred_language: string;
    websitememberaccounttype: string;
    source: string;
    company: string;
    employment_status:string;
    tool_usage: Array<string>;
    my_trade: Array<string>
    opt_in_marketing_product_research: boolean;
    optinproductresearchdate: string;
    optoutproductresearchdate: string;
    optinnewsletters: boolean;
    optinnewslettersdate: string;
    optoutnewslettersdate: string;
    optinconfirmationdate: string;
    advertisingconsent: boolean;
    advertisingconsentdate: string;
    sms: boolean;
    smsdate: string;
    status: string;
    myinterests: Array<string>
    jobrole: Array<string>
    globalid: string
    clientid: string
    constructor(data: IUser) {
      this.email = data.email || data.emailAddress;
      this.aic_uuid = data.uuid;
      this.emailverified = data.emailverified? dateToEpochTD(new Date(data.emailverified)) : "";
      this.brand = data.brand;
      this.region = data.region;
      this.market = data.market;
      this.muuid = data.MUUID;
      this.givenname = data.givenName;
      this.familyname = data.familyName;
      this.primaryaddress = data.primaryAddress;
      this.created = data.createdDate ? dateToEpochTD(new Date(data.createdDate)) : "";
      this.createddate = data.createdDate ? dateToEpochTD(new Date(data.createdDate)) : "";
      this.lastlogin = data.lastLoginDate ? dateToEpochTD(new Date(data.lastLoginDate)) : "";
      this.lastlogindate = data.lastLoginDate ? dateToEpochTD(new Date(data.lastLoginDate)) : "";
      this.lastupdateddate = data.updatedDate ? dateToEpochTD(new Date(data.updatedDate)) : "";
      this.islegacy = data.islegacy;
      this.ismigrated = data.ismigrated;
      this.preferred_language = data.language? data.language : ""
      this.websitememberaccounttype = data.websiteMemberAccountType;
      this.source = data.source;
      this.company = data.company;
      this.employment_status = data?.demographic?.employmentStatus ? data?.demographic?.employmentStatus : "";
      this.tool_usage = data.tool_usage;
      this.my_trade = data.demographic? data.demographic.trade : [];
      this.opt_in_marketing_product_research = data.optInProductResearch;
      this.optinproductresearchdate = data.optInProductResearchDate ? dateToEpochTD(new Date(data.optInProductResearchDate)) : "";
      this.optoutproductresearchdate = data.optOutProductResearchDate ? dateToEpochTD(new Date(data.optOutProductResearchDate)) : "";
      this.optinnewsletters = data.optInNewsletters;         
      this.familyname = data.familyName;       
      this.givenname = data.givenName;          
      this.optinnewslettersdate = data.optInNewslettersDate ? dateToEpochTD(new Date(data.optInNewslettersDate)) : "";
      this.optoutnewslettersdate = data.optOutNewslettersDate ? dateToEpochTD(new Date(data.optOutNewslettersDate)) : "",
      this.optinconfirmationdate = data.optinConfirmationDate ? dateToEpochTD(new Date(data.optinConfirmationDate)) : "";
      this.advertisingconsent = data.advertisingConsent;
       this.advertisingconsentdate = data.advertisingConsentDate ? dateToEpochTD(new Date(data.advertisingConsentDate)) : "";
      this.sms = data.sms;
      this.smsdate = data.smsDate ? dateToEpochTD(new Date(data.smsDate)): "";
      this.status = data.accountstatus;
      this.myinterests = data.myInterests
      this.jobrole = data.jobRoleORFunction
      this.globalid = data.globalId
      this.clientid = data.clientId
    }
  }

  export class changeEmailTD {
    old_email: string;
    new_email: string;
    brand: string;
    market: string;
    region: string;
    muuid?: string;
    constructor (data: any) {
      this.old_email = data.currentEmail
      this.new_email = data.newEmail
      this.brand = data.brand
      this.market = data.market
      this.region = data.region
      this.muuid = data.MUUID
    }
  }