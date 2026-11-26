import Booking from '../booking/booking.model.js';
import ParkingSlot from '../parking-slot/parking-slot.model.js';

const getDashboardStats = async () => {
  const now = new Date();

  // UTC boundaries keep date calculations consistent
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const [
    totalSlots,
    activeSlots,
    maintenanceSlots,
    twoWheelerSlots,
    fourWheelerSlots,
    confirmedBookings,
    cancelledBookings,
    completedBookings,
    bookingsCreatedToday,
    currentlyParked,
  ] = await Promise.all([
    ParkingSlot.countDocuments(),
    ParkingSlot.countDocuments({ status: 'ACTIVE' }),
    ParkingSlot.countDocuments({ status: 'MAINTENANCE' }),
    ParkingSlot.countDocuments({ vehicleType: 'TWO_WHEELER' }),
    ParkingSlot.countDocuments({ vehicleType: 'FOUR_WHEELER' }),

    Booking.countDocuments({ status: 'CONFIRMED' }),
    Booking.countDocuments({ status: 'CANCELLED' }),
    Booking.countDocuments({ status: 'COMPLETED' }),

    Booking.countDocuments({
      createdAt: {
        $gte: todayStart,
        $lt: tomorrowStart,
      },
    }),

    Booking.countDocuments({
      status: 'CONFIRMED',
      entryAt: { $ne: null },
      exitAt: null,
    }),
  ]);

  return {
    slots: {
      total: totalSlots,
      active: activeSlots,
      maintenance: maintenanceSlots,
      twoWheeler: twoWheelerSlots,
      fourWheeler: fourWheelerSlots,
    },

    bookings: {
      confirmed: confirmedBookings,
      cancelled: cancelledBookings,
      completed: completedBookings,
      createdToday: bookingsCreatedToday,
    },

    occupancy: {
      currentlyParked,
    },
  };
};

export default {
  getDashboardStats,
};
