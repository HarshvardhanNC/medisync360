import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './db';
import reportRoutes from './routes/reportRoutes';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
import authRoutes from './routes/authRoutes';
import hospitalRoutes from './routes/hospitalRoutes';
import userRoutes from './routes/userRoutes';
import aiRoutes from './routes/aiRoutes';
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('MediSync360 API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
