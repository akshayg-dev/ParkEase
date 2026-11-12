import cookieParser from 'cookie-parser';
import express from 'express';
import authRoutes from './module/auth/auth.routes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

export default app;
