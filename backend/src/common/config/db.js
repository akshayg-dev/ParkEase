import mongoose from 'mongoose';

const mongoUri =
  process.env.NODE_ENV === 'production'
    ? process.env.MONGODB_URI_PRODUCTION
    : process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log('DB connection successful');
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`DB Connection failed`, error);
    throw error;
  }
};

export default connectDB;
