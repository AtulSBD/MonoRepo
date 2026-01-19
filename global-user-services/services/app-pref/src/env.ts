
import * as dotenv from 'dotenv';



dotenv.config();

export const port = `${process.env.PORT}` || 8002;
export const mongoUri = `${process.env.MONGO_URI}`;
export const dbName = `${process.env.DB_NAME}`;
export const env = `${process.env.ENV}` || 'localhost';


if ( !mongoUri || !dbName || !port || !env)  {
    console.error("Please ensure all environment variables|env.ts[mongoUri|dbName|port] are notset.");
    process.exit(1);
  }

export const newRelicLogApiUrl = process.env.NEW_RELIC_LOG_API_URL
export const newRelicLogApiKey = process.env.NEW_RELIC_API_KEY

export const MONGO_MAX_POOL_SIZE = parseInt(process.env.MONGODB_MAX_POOL_SIZE || '20', 10);
export const MONGO_MIN_POOL_SIZE = parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10);
export const MONGO_MAX_IDLE_TIME_MS = parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '30000', 10);
export const MONGO_SERVER_SELECTION_TIMEOUT_MS = parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10);

