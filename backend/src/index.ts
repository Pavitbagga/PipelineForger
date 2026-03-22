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
import engineRouter, { validateHandler } from './routes/engine';
import pipelineHistoryRouter, { summarizeHandler } from './routes/pipelineHistory';
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
// /api/pipelines/summarize registered before /:id routes to avoid param collision
app.post('/api/pipelines/summarize', requireAuth, summarizeHandler);
app.use('/api/pipelines',            requireAuth, pipelinesRouter);
// Pipeline changelog history on a separate base path to avoid /:id conflicts
app.use('/api/history',              requireAuth, pipelineHistoryRouter);

// Engine routes — validate is public; all others require auth
app.post('/api/engine/validate', validateHandler);
app.use('/api/engine',           requireAuth, engineRouter);

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
