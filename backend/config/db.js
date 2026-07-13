import dns from "dns";
import mongoose from "mongoose";

// Work around Node.js DNS SRV resolution issues on some Windows/network setups.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

export const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        dbName: "CarRental",
        retryWrites: true,
        w: "majority",
    })
    .then(() => console.log('DB Connected'))
    .catch((error) => {
        console.error('DB connection error:', error);
        throw error;
    });
}