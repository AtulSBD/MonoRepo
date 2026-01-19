import { IPrimaryAddress, IDemographic } from "./userModel";

export interface IUserResponse {
    firstName: string;
    lastName: string;
    email: string;
    primaryAddress: IPrimaryAddress;
    displayName: string;
    photos: Array<string>;
    uuid: string;
    websiteMemberAccountType: string;
    websiteRegistrationDate: string;
    source: string;
    deactivateAccount: string;
    demographic: IDemographic;
    emailVerified: string;
    display: string;
    currentLocation: string;
    lastUpdated: string;
    authorization_code: string;
    access_token: string;
    MUUID: string; // Added MUUID here
}

class UserResponse {
    firstName: string;
    lastName: string;
    email: string;
    primaryAddress: IPrimaryAddress;
    displayName: string;
    photos: Array<string>;
    uuid: string;
    websiteMemberAccountType: string;
    websiteRegistrationDate: string;
    source: string;
    deactivateAccount: string;
    demographic: IDemographic;
    emailVerified: string;
    display: string;
    currentLocation: string;
    lastUpdated: string;
    authorization_code: string;
    access_token: string;
    MUUID: string; // Added MUUID here

    constructor(userPIIData: any) {
        this.firstName = userPIIData.givenName;
        this.lastName = userPIIData.familyName;
        this.email = userPIIData.email;
        this.primaryAddress = userPIIData.primaryAddress;
        this.displayName = userPIIData.displayName;
        this.photos = userPIIData.photos;
        this.uuid = userPIIData.uuid;
        this.websiteMemberAccountType = userPIIData.websiteMemberAccountType;
        this.websiteRegistrationDate = userPIIData.websiteRegistrationDate;
        this.source = userPIIData.source;
        this.deactivateAccount = userPIIData.deactivateAccount;
        this.demographic = userPIIData.demographic;
        this.emailVerified = userPIIData.emailVerified;
        this.display = userPIIData.display;
        this.currentLocation = userPIIData.currentLocation;
        this.lastUpdated = userPIIData.lastUpdated;
        this.authorization_code = userPIIData.authorization_code;
        this.access_token = userPIIData.access_token;
        this.MUUID = userPIIData.MUUID; // Initialize MUUID here
    }
}

export default UserResponse;

