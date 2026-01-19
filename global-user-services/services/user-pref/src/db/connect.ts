import mongoose from "mongoose";
import { MONGO_MAX_IDLE_TIME_MS, MONGO_MAX_POOL_SIZE, MONGO_MIN_POOL_SIZE, MONGO_SERVER_SELECTION_TIMEOUT_MS, mongoUri, dbName } from "../env";

// Connection state mapping for logging
const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

// Log connection pool statistics
const logConnectionStats = () => {
  const conn = mongoose.connection;
  const state = connectionStates[conn.readyState as keyof typeof connectionStates] || 'unknown';

  console.log('=== MongoDB Connection Status ===');
  console.log(`State: ${state}`);
  console.log(`Host: ${conn.host}:${conn.port}`);
  console.log(`Database: ${conn.name}`);
};

mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB Connected');
      logConnectionStats();
    });

mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err);
      logConnectionStats();
    });

mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB Disconnected');
      logConnectionStats();
    });

mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB Reconnected');
      logConnectionStats();
    });

    // Monitor connection pool events
mongoose.connection.on('fullsetup', () => {
      console.log('📊 MongoDB Connection Pool: All servers connected');
    });

export const connectDB = async () => {

   if (mongoose.connection.readyState === 1) {
    console.log("MongoDB already connected, skipping...");
    return;
  }

  // Skip if already connecting - let the existing connection attempt complete
  if (mongoose.connection.readyState === 2) {
    console.log("MongoDB connection in progress, skipping duplicate call...");
    return;
  }
  try {
    // Set up connection event listeners BEFORE connecting
    

    await mongoose.connect(`${mongoUri}/${dbName}` as string, {
      maxPoolSize: MONGO_MAX_POOL_SIZE, // Maximum number of connections in the pool
      minPoolSize: MONGO_MIN_POOL_SIZE, // Minimum number of connections in the pool
      maxIdleTimeMS: MONGO_MAX_IDLE_TIME_MS,  // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: MONGO_SERVER_SELECTION_TIMEOUT_MS, // How long to try selecting a server
    });

  } catch (error) {
    process.exit(1);
  }
};


export const disconnectDB = async () => {
  try {
    console.log('🔄 Disconnecting MongoDB...');
    await mongoose.disconnect();
    console.log("✅ MongoDB Disconnected...");
  } catch (error) {
    console.error("❌ Error disconnecting MongoDB:", error);
  }
};
