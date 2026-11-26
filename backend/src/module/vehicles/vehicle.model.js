import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    vehicleOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicleNumber: {
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
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Vehicle', vehicleSchema);
