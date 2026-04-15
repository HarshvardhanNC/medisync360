import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import authRouter from './routes/authRoutes';
import aiRouter from './routes/aiRoutes';
import userRouter from './routes/userRoutes';
import reportRouter from './routes/reportRoutes';
import hospitalRouter from './routes/hospitalRoutes';
import adminRouter from './routes/adminRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({ message: 'MediSync360 backend is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/users', userRouter);
app.use('/api/reports', reportRouter);
app.use('/api/hospitals', hospitalRouter);
app.use('/api/admin', adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
