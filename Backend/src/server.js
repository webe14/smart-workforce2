import dotenv from 'dotenv';
import app from './app.js';
import cors from 'cors';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});