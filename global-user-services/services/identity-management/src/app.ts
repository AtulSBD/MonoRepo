import express, {Request, Response} from 'express';
import cors from 'cors';
import authRouter from './routes/auth.routes';
import userRoutes from "./routes/user.routes";
import passwordRoutes from './routes/password.routes';
import os from 'os';
import { setConfig } from './services/config.service';
import * as config from './env'
import { User } from './models/user';


const app = express();  
app.use(cors());
const PORT = config.port;
app.use(express.json());
app.set('trust proxy', 1);

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
app.get('/api/uup/health', (req, res) => {
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
app.get('/api/uup-dev/health', (req, res) => {
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
app.use("/api/uup/users", userRoutes);
app.use('/api/uup/auth', authRouter)
app.use('/api/uup/password', passwordRoutes);


app.use("/api/uup-dev/users", userRoutes);
app.use('/api/uup-dev/auth', authRouter)
app.use('/api/uup-dev/password', passwordRoutes);


app.post('/api/uup/loadCache', async (req: Request, res: Response): Promise<any> => {
  try {
    await setConfig('AIC')
    await setConfig('TD')
    await setConfig('ITERABLE')
    res.status(200).json({message: "Cache reloaded"})
  } catch (error) {
    res.status(500).json({message: "Fail to load cache", error})
  }
})

app.post('/api/uup-dev/loadCache', async (req: Request, res: Response): Promise<any> => {
  try {
    await setConfig('AIC')
    await setConfig('TD')
    await setConfig('ITERABLE')
    res.status(200).json({message: "Cache reloaded"})
  } catch (error) {
    res.status(500).json({message: "Fail to load cache", error})
  }
})

app.get('/api/users', async (_req, res) => {
  const users = await User.find();
  res.json(users);
});


export default app