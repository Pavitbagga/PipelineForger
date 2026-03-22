import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

import intentRouter from './routes/intent';
import copilotRouter from './routes/copilot';
import runRouter from './routes/run';
import shipRouter from './routes/ship';
import validateRouter from './routes/validate';
import sketchRouter from './routes/sketch';
import pipelinesRouter from './routes/pipelines';
import { requireAuth } from './middleware/auth';

const app = express();
const PREFERRED_PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/generate-pipeline', requireAuth, intentRouter);
app.use('/api/copilot',           requireAuth, copilotRouter);
app.use('/api/test-run',          requireAuth, runRouter);
app.use('/api/generate-code',     requireAuth, shipRouter);
app.use('/api/validate-connection', requireAuth, validateRouter);
app.use('/api/interpret-sketch',  requireAuth, sketchRouter);
app.use('/api/pipelines',         requireAuth, pipelinesRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

function startServer(port: number): void {
  const server = app.listen(port, () =>
    console.log(`Backend running on port ${port}`)
  );
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}…`);
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}

startServer(PREFERRED_PORT);
