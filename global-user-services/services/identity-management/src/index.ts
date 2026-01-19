// src/index.ts
import app from './app';
import * as config from './env';
import { setConfig } from './services/config.service';
import connectDB, { disconnectDB } from './config/db';
import { Server } from 'http';

const PORT = config.port;
let server: Server | undefined;

/**
 * Start the application server after connecting to the database.
 */
async function startServer() {
  try {
    await connectDB();
    server = app.listen(PORT, async () => {
        await setConfig('AIC');
        await setConfig('TD');
        await setConfig('ITERABLE');
      console.log(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to DB error:', error);
    process.exit(1);
  }
}

startServer();


// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if(server){
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  if(server){
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  }
});