
import 'dotenv/config';

import app from './src/app.js';
import connectDB from './src/common/config/db.js';
import startBookingJob from './src/module/booking/booking.job.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start scheduled booking lifecycle job
    startBookingJob();

    // Start Express server
    app.listen(PORT, () => {
      console.log(
        `ParkEase backend is running successfully!! on PORT: ${PORT} in ${process.env.NODE_ENV} mode`,
      );
    });
  } catch (err) {
    console.error('Failed to start the server:', err);
    process.exit(1);
  }
};

start();
