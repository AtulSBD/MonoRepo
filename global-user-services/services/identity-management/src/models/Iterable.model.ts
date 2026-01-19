import { IUser } from "./userModel"

export interface IIterable {
    eventName: string,
    email: string,
    dataFields: UserBasicData,
    createdAt: number,
    createNewFields: boolean
}

interface UserBasicData {
    first_name: string,
    last_name: string,
    market: string,
    brand: string,
    source: string,
    page_url: string
  }


class IIterableClass {
    eventName: string;
    email: string;
    dataFields: UserBasicData;
    createdAt: number;
    createNewFields: boolean

    constructor(data: IUser) {
        this.eventName = "DOI_TRIGGER",
        this.email = data.emailAddress,
        this.dataFields = {
            first_name: data.givenName,
            last_name: data.familyName,
            market: data.market,
            brand: data.brand,
            source: data.source,
            page_url: data.newsletterURL
        },
        this.createdAt = data.createdAt,
        this.createNewFields = data.createNewFields
    }
}

export default IIterableClass;