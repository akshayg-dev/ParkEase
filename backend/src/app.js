import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './module/auth/auth.routes.js';
import vehicleRoutes from './module/vehicles/vehicle.routes.js';
import errorHandler from './common/middleware/error.middleware.js';
import parkingSlotRoutes from './module/parking-slot/parking-slot.routes.js';
import bookingRoutes from './module/booking/booking.routes.js';
import adminRoutes from './module/admin/admin.routes.js';

const app = express();

// Render sits behind a proxy; needed so secure cookies work over HTTPS
app.set('trust proxy', 1);

// Allowed frontend origins (supports comma-separated URLs)
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      console.log('Request Origin:', origin);
      console.log('Allowed Origins:', allowedOrigins);

      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
        return callback(null, true);
      }

      console.error('CORS blocked origin:', origin);

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Middleware
app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parking-slots', parkingSlotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
