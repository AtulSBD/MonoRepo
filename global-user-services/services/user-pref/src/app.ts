import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4"
import { UserPrefTypeDefs } from "./user-pref/user-pref-schema";
import { userPrefResolvers } from "./user-pref/user-pref-resolver";
import { userActivityTypeDefs } from "./user-activity/user-activity-schema";
import { userActivityResolvers } from "./user-activity/user-activity-resolver";
import { connectDB } from "./db/connect";
import bodyParser from "body-parser";
import { port } from "./env";
import cors from "cors";
import os from "os";
import { ConfigTypeDefs } from "./config/config-schema";
import { configResolvers } from "./config/config-resolver";
import { loadTDConfig } from "./utils/td.service";
import { formatUptime, formatMemory } from "./utils/shared";


const app = express();
app.use(cors({ origin: "*", credentials: true }))
app.use(express.json())
app.use(bodyParser.json());

const startServer = async () => {
  const db = await connectDB();

  const server = new ApolloServer({
    typeDefs: [UserPrefTypeDefs, userActivityTypeDefs, ConfigTypeDefs],
    resolvers: [userPrefResolvers, userActivityResolvers, configResolvers],
    introspection: true
  });
  await server.start();

  app.get('/uup/graphql/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.status(200).send({
      status: "Ok",
      uptime: formatUptime(process.uptime()),
      memoryUsage: {
        rss: formatMemory(memoryUsage.rss), // Resident Set Size
        heapTotal: formatMemory(memoryUsage.heapTotal),
        heapUsed: formatMemory(memoryUsage.heapUsed),
        external: formatMemory(memoryUsage.external),
      },
      loadAverage: os.loadavg().map(load => load.toFixed(2)), // 1, 5, 15 min load avg
      freeMemory: formatMemory(os.freemem()),
      totalMemory: formatMemory(os.totalmem()),
    });
  });
  app.use('/uup/graphql', expressMiddleware(server, {
    context: async () => ({ db })
  }))

  /*---------------------------------------------------To be perameterised letter------------------------------------*/

  app.get('/uup-dev/graphql/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.status(200).send({
      status: "Ok",
      uptime: formatUptime(process.uptime()),
      memoryUsage: {
        rss: formatMemory(memoryUsage.rss), // Resident Set Size
        heapTotal: formatMemory(memoryUsage.heapTotal),
        heapUsed: formatMemory(memoryUsage.heapUsed),
        external: formatMemory(memoryUsage.external),
      },
      loadAverage: os.loadavg().map(load => load.toFixed(2)), // 1, 5, 15 min load avg
      freeMemory: formatMemory(os.freemem()),
      totalMemory: formatMemory(os.totalmem()),
    });
  });
  app.use('/uup-dev/graphql', expressMiddleware(server, {
    context: async () => ({ db })
  }))
  /*------------------------------------------------------------------------------------------------------------*/

  app.listen(port, async () => {
    await loadTDConfig()
    console.log(`🚀 Server ready at http://localhost:${port}/uup/graphql`)
  })
}
export default startServer;