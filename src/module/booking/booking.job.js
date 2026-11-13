import cron from 'node-cron';
import Booking from './booking.model.js';

const completeExpiredBookings = async () => {
  try {
    const result = await Booking.updateMany(
      {
        status: 'CONFIRMED',
        endTime: { $lte: new Date() },
      },
      {
        $set: {
          status: 'COMPLETED',
        },
        $unset: {
          qrTokenHash: 1,
        },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[Booking Job] Completed ${result.modifiedCount} expired booking(s)`,
      );
    }
  } catch (error) {
    console.error('[Booking Job] Failed to complete expired bookings:', error);
  }
};

const startBookingJob = () => {
  // Run once at startup to process bookings that expired while server was down.
  completeExpiredBookings();

  // Then run every minute.
  cron.schedule('* * * * *', completeExpiredBookings);

  console.log('[Booking Job] Scheduled successfully');
};

export default startBookingJob;
