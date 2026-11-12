import mongoose from 'mongoose';
import bcrypt from 'bcrypt'; // Use the package you already installed

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 50,
      required: [true, 'Name is required'],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, 'Email is required'],
      unique: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      select: false,
    },

    verificationTokenExpires: {
      type: Date,
      select: false,
    },

    refreshToken: {
      type: String,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true },
);

// Hash password only when it has been modified.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// Compare plain-text password with stored hash.
userSchema.methods.comparePassword = async function (clearTextPassword) {
  return bcrypt.compare(clearTextPassword, this.password);
};

export default mongoose.model('User', userSchema);
