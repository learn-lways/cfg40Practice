const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce";
  const isAtlas = mongoURI.includes("mongodb+srv");

  try {
    console.log(
      `🔄 Attempting to connect to ${
        isAtlas ? "MongoDB Atlas" : "Local MongoDB"
      }...`
    );

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: isAtlas ? 10000 : 5000, // 10s for Atlas, 5s for local
      socketTimeoutMS: 45000,
    });

    console.log(
      `✅ MongoDB Connected: ${conn.connection.host} (${
        isAtlas ? "Atlas" : "Local"
      })`
    );

    // Set up connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("📊 Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📴 Mongoose disconnected from MongoDB");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("📴 MongoDB connection closed through app termination");
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error(
      `❌ ${isAtlas ? "MongoDB Atlas" : "Local MongoDB"} connection failed:`,
      error.message
    );

    // If Atlas fails, try local MongoDB as fallback
    if (isAtlas && process.env.NODE_ENV === "development") {
      console.log("🔄 Trying local MongoDB as fallback...");
      try {
        const fallbackConn = await mongoose.connect(
          "mongodb://localhost:27017/ecommerce",
          {
            serverSelectionTimeoutMS: 5000,
          }
        );
        console.log(
          `✅ MongoDB Connected (Local Fallback): ${fallbackConn.connection.host}`
        );
        return fallbackConn;
      } catch (fallbackError) {
        console.error(
          "❌ Local MongoDB fallback also failed:",
          fallbackError.message
        );
      }
    }

    console.error("💥 All database connections failed. Exiting...");
    process.exit(1);
  }
};

module.exports = connectDB;
