import { Server } from 'http';
import { disconnectDB } from "./db/connect";
import startServer from "./app";

let server: Server | undefined;

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