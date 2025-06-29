// Minimal Express backend for Dopamine Diner API (supports /api/daily-analysis)

import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { dailyAnalysisHandler } from './api/rewrite.js';

dotenv.config({ path: '.env' }); // or '.env.local' if you use that

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Health check
app.get('/', (req, res) => {
  res.send('Dopamine Diner API is running.');
});

// Only /api/daily-analysis is supported, not /api/rewrite
app.post('/api/daily-analysis', (req, res) => {
  dailyAnalysisHandler(req, res);
});

// Optional: 404 for all other API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found. Use /api/daily-analysis.' });
});

app.listen(PORT, () => {
  console.log(`Dopamine Diner API listening on http://localhost:${PORT}`);
});
