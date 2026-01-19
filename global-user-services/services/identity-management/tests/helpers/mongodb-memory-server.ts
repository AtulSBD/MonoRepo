import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
let mongoServer: MongoMemoryServer;
export async function setupTestDatabase() {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  // Connect mongoose to the in-memory database
  await mongoose.connect(mongoUri);
  console.log('Test database connected');
}
export async function teardownTestDatabase() {
  // Disconnect and stop the server
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('Test database disconnected');
}
export async function clearDatabase() {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
