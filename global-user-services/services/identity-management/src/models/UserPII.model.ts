import { IDemographic, IPrimaryAddress, IUser } from "./userModel";

export interface IUserPII {
    firstName: string;
    lastName: string;
    emailAddress: string;
    region: string;
    brand: string;
    market: string;
    addressCity: string;
    addressPhone: string;
    addressCountry: string;
    addressPostalCode: string;
    addressState: string;
    addressStreetAddress1: string;
    addressStreetAddress2: string;
    displayName: string;
    newPassword: string;
    newPasswordConfirm: string;
    websiteMemberAccountType: string;
    source: string;
    demographic: IDemographic;
    MUUID:string;
}


class UserPII {
    static mockImplementation(arg0: () => { brand: string; region: string; emailAddress: string; }) {
        throw new Error('Method not implemented.');
    }
    firstName: string;
    lastName: string;
    emailAddress: string;
    region: string;
    brand: string;
    market: string;
    addressCity: string;
    phone: string;
    addressCountry: string;
    addressPostalCode: string;
    addressState: string;
    addressStreetAddress1: string;
    addressStreetAddress2: string;
    addressCompany: string;
    displayName: string;
    newPassword: string;
    newPasswordConfirm: string;
    websiteMemberAccountType: string;
    source: string;
    demographic: IDemographic;
    MUUID:string;
    constructor(userPIIData: IUser) {
        this.firstName = userPIIData.givenName
        this.lastName = userPIIData.familyName
        this.emailAddress = userPIIData.emailAddress || userPIIData.email
        this.region = userPIIData.region
        this.brand = userPIIData.brand
        this.market = userPIIData.market
        this.addressCity = userPIIData.primaryAddress?.city
        this.phone = userPIIData.primaryAddress?.phone
        this.addressCountry = userPIIData.primaryAddress?.country
        this.addressPostalCode = userPIIData.primaryAddress?.zip
        this.addressState = userPIIData.primaryAddress?.stateAbbreviation
        this.addressStreetAddress1 = userPIIData.primaryAddress?.address1
        this.addressStreetAddress2 = userPIIData.primaryAddress?.address2
        this.addressCompany = userPIIData.primaryAddress?.company
        this.displayName = userPIIData.displayName
        this.newPassword = userPIIData.newPassword
        this.demographic = userPIIData.demographic
        this.newPasswordConfirm = userPIIData.newPasswordConfirm
        this.source = userPIIData.source
        this.websiteMemberAccountType = userPIIData.websiteMemberAccountType
        this.MUUID=userPIIData.MUUID
    }
}

export default UserPII;

