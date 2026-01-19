import { dateToEpochTD } from "../Utils/shared";
import { IPrimaryAddress, IUser } from "./userModel";
export class NewsletterTD {
    givenname: string;
    familyname: string;
    email: string;
    region: string;
    brand: string;
    market: string;
    primaryaddress: IPrimaryAddress;
    preferred_language: string;
    tool_usage: Array<string>;
    optinnewsletters: boolean;
    optinnewslettersdate: string;
    advertisingconsent: boolean;
    advertisingconsentdate: string;
    smsconsent: boolean;
    smsconsentdate: string;
    globalid: string;
    clientid: string;
    pageurl: string;
    updateddate: string;

    constructor(user: IUser) {
    this.givenname = user.givenName
    this.familyname = user.familyName
    this.email = user.email || user.emailAddress
    this.region = user.region
    this.brand = user.brand
    this.market = user.market
    this.primaryaddress = user.primaryAddress 
    this.preferred_language = user.language? user.language : ""
    this.tool_usage = user.tool_usage
    this.optinnewsletters = user.emailConsent || user.optInNewsletters;
    this.optinnewslettersdate = user.optInNewslettersDate ? dateToEpochTD(new Date(user.optInNewslettersDate)) : "";
    this.advertisingconsent = user.advertisingConsent;
    this.advertisingconsentdate = user.advertisingConsentDate ? dateToEpochTD(new Date(user.advertisingConsentDate)) : "";
    this.smsconsent = user.sms;
    this.smsconsentdate = user.smsDate ? dateToEpochTD(new Date(user.smsDate)): "";
    this.globalid = user.globalId
    this.clientid = user.clientId
    this.pageurl = user.newsletterURL
    this.updateddate = user.updatedDate ? dateToEpochTD(new Date(user.updatedDate)) : "";
    }
}
