import express from "express";
import cors from "cors";
import connectDB from "./config/db";
import questionRoutes from "./routes/questionRoutes";
import preferenceRoutes from './routes/preferenceRoutes';
import os from "os";
 
 
const app = express();
 
// Connect to DB
connectDB();
 
// Middleware
app.use(cors());
app.use(express.json());
 
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
 
// Function to format memory usage into MB or GB
function formatMemory(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
}
app.get('/api/app-pref/health', (req, res) => {
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
// Routes
app.use("/api/app-pref/questionsAndAnswers", questionRoutes);
app.use('/api/app-pref/preferences', preferenceRoutes);


app.get('/api/app-pref-dev/health', (req, res) => {
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
// Routes
app.use("/api/app-pref-dev/questionsAndAnswers", questionRoutes);
app.use('/api/app-pref-dev/preferences', preferenceRoutes);
 
export default app;