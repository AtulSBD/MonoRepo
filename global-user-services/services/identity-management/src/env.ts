import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {Buffer} from 'buffer';

if (process.env.NODE_ENV?.trim() === 'production') {
    dotenv.config({path: "/configuration/.env"});
 } else {
     dotenv.config();
 }

const secrets: Record<string, string> = {};

// Read and store all secrets from directory
if (process.env.NODE_ENV?.trim() === 'production') {
    const secretPath = '/etc/secret-volume';
    try {
        const secretFiles = fs.readdirSync(secretPath);
        secretFiles.forEach((file) => {
            const filepath = path.join(secretPath, file);
            if(fs.statSync(filepath).isFile()){
                const secretValue = fs.readFileSync(filepath, 'utf8').trim();
                secrets[file] = secretValue;
            }
        })
    } catch (error) {
        console.error("Error while reading secrets", error)
    }
}

export const region = `${process.env.REGION}`
export const appID = `${process.env.APP_ID}`
export const captureDomain = `${process.env.CAPTURE_DOMAIN}` 


export const MONGO_MAX_POOL_SIZE = parseInt(process.env.MONGODB_MAX_POOL_SIZE || '20', 10);
export const MONGO_MIN_POOL_SIZE = parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10);
export const MONGO_MAX_IDLE_TIME_MS = parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '30000', 10);
export const MONGO_SERVER_SELECTION_TIMEOUT_MS = parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10);


export const port = `${process.env.PORT}`  
export const baseURL = `${process.env.BASE_URL}`
export const graphqlURL =`${process.env.GRAPHQL_URL}`  
export const mongodb =   `${process.env.MONGODB_URI}`                                                      
export const dbName = `${process.env.DB_NAME}`
export const configCollection = `${process.env.CONFIG_COLLECTION}`
export const graphqlURLGPR = `${process.env.GRAPHQL_URL_GPR}`
export const migrateApiUrl = `${process.env.GPR_MIGRATION_URL}`

export const mongoUri = `${process.env.MONGODB_URI}`         

export const AES_SECRET= process.env.AES_SECRET ||'';
export const AES_IV = process.env.AES_IV ||'';


export const masterKey = secrets['LOCAL_MASTER_KEY'] || `${process.env.LOCAL_MASTER_KEY}`
export const secretKey = secrets['SECRET_KEY'] || process.env.SECRET_KEY || 'defaultSecretKey';

export const newRelicLogApiUrl = process.env.NEW_RELIC_LOG_API_URL
export const newRelicLogApiKey = process.env.NEW_RELIC_API_KEY

export const tdTokenUrl = `${process.env.TD_TOKEN_URL}`;
export const tdClientId = `${process.env.TD_CLIENT_ID}`; 
export const tdClientSecret = `${process.env.TD_CLIENT_SECRET}`;