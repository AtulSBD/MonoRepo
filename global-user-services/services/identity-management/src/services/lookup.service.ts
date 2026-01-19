import axios from "axios"
import https from 'https';
import * as config from "../env";

const agent = new https.Agent({ rejectUnauthorized: false })
export const getMarket = async (data: string) => {
    const graphqlURLGPR = `${config.graphqlURLGPR}`;
    try {
        const query = `query GetMarkets {
  getMarkets {
    _id
    name
    regionId
    languages
  }
}`
        const response = await axios.post(
            graphqlURLGPR, {
                query: query,
            },
            { httpsAgent: agent }
        )
        const market = response.data.data.getMarkets.filter((item: any) => item._id === data.toUpperCase());
        return {isExits: market.length > 0, data: market[0]}
    } catch (error) {
        throw error
    }
}

export const getBrand = async (data: string) => {
    const graphqlURLGPR = `${config.graphqlURLGPR}`;
    try {
        const query = `query Brands {
            brands {
                _id
                name
            }
        }`
        const response = await axios.post(
            graphqlURLGPR, {
            query: query,
            veriables: {}
        },
        { httpsAgent: agent }
        )
        const brand = response.data.brands.filter((item: any) => item._id === data);
        return brand.length > 0
    } catch (error) {
        throw error
    }
}

export const getRegion = async (data: string) => {
    const graphqlURLGPR = `${config.graphqlURLGPR}`;
    try {
        const query = `query Regions {
            regions {
                _id
                name
                allowCrossMarketReg
                allowToDashboard
            }
        }`
        const response = await axios.post(
            graphqlURLGPR, {
            query: query,
            veriables: {}
        },
        { httpsAgent: agent }
        )
        const region = response.data.regions.filter((item: any) => item._id === data);
        return region.length > 0
    } catch (error) {
        throw error
    }
}