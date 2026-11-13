import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './module/auth/auth.routes.js';
import vehicleRoutes from './module/vehicles/vehicle.routes.js';
import errorHandler from './common/middleware/error.middleware.js';
import parkingSlotRoutes from './module/parking-slot/parking-slot.routes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Enable only when your frontend uses a different origin.
if (process.env.FRONTEND_URL) {
  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    }),
  );
}

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parking-slots', parkingSlotRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler must be last.
app.use(errorHandler);

export default app;
