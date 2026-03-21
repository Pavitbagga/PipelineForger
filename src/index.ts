import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

import intentRouter from './routes/intent';
import copilotRouter from './routes/copilot';
import runRouter from './routes/run';
import shipRouter from './routes/ship';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/intent', intentRouter);
app.use('/api/copilot', copilotRouter);
app.use('/api/run', runRouter);
app.use('/api/ship', shipRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
