import cron from 'node-cron';
import Booking from './booking.model.js';

const completeExpiredBookings = async () => {
  try {
    const now = new Date();

    // Complete expired bookings where the customer is not inside.
    // These QR tokens are no longer needed.
    const completedOutside = await Booking.updateMany(
      {
        status: 'CONFIRMED',
        endTime: { $lte: now },
        $or: [{ entryAt: null }, { exitAt: { $ne: null } }],
      },
      {
        $set: { status: 'COMPLETED' },
        $unset: { qrTokenHash: 1 },
      },
    );

    // Complete expired bookings where the customer entered
    // but has not yet scanned out. Preserve the QR for exit.
    const completedInside = await Booking.updateMany(
      {
        status: 'CONFIRMED',
        endTime: { $lte: now },
        entryAt: { $ne: null },
        exitAt: null,
      },
      {
        $set: { status: 'COMPLETED' },
      },
    );

    const totalCompleted =
      completedOutside.modifiedCount + completedInside.modifiedCount;

    if (totalCompleted > 0) {
      console.log(
        `[Booking Job] Completed ${totalCompleted} expired booking(s)`,
      );
    }
  } catch (error) {
    console.error('[Booking Job] Failed to complete expired bookings:', error);
  }
};

const startBookingJob = () => {
  // Process expired bookings when the server starts.
  completeExpiredBookings();

  // Then check every minute.
  cron.schedule('* * * * *', completeExpiredBookings);

  console.log('[Booking Job] Scheduled successfully');
};

export default startBookingJob;
