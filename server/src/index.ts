import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import assistRoute from './routes/assist';
import ingestRoute from './routes/ingest';

const app = express();
app.use(cors({ origin: 'http://localhost:5173'}));
app.use(express.json());

app.post('/api/assist', assistRoute);
app.post('/api/ingest', ingestRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server http://localhost:${port}`));