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
  },
  { timestamps: true },
);

export default mongoose.model('ParkingSlot', parkingSlotSchema);
