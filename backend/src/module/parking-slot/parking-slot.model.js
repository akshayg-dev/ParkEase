import mongoose from 'mongoose';

const parkingSlotSchema = new mongoose.Schema(
  {
    slotNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    vehicleType: {
      type: String,
      enum: ['TWO_WHEELER', 'FOUR_WHEELER'],
      required: true,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'MAINTENANCE'],
      default: 'ACTIVE',
      required: true,
    },

    bookingLockToken: {
      type: String,
      select: false,
    },

    bookingLockUntil: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model('ParkingSlot', parkingSlotSchema);
