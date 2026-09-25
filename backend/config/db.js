const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the connection string in MONGO_URI.
 * Call this once when the server boots (see server.js).
 */
const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });

    return conn;
  } catch (err) {
    console.error(`MongoDB initial connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
