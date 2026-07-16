import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import patientRoutes from './routes/patient.routes';
import visitRoutes from './routes/visit.routes';
import { errorHandler } from './middleware/errorHandler';
import { pool } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1;');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`EMR backend running on http://localhost:${PORT}`);
});