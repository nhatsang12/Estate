const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = (process.env.MONGO_URI || '').trim();
  if (!mongoUri) {
    throw new Error('Database connection error: MONGO_URI is missing');
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    throw new Error(`Database connection error: ${err.message}`);
  }
};

module.exports = connectDB;
