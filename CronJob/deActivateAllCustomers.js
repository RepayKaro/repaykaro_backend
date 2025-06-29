require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const CustomerModel = require("../Models/Customer");

// MongoDB connection configuration using .env
const mongoURI = process.env.ENVIRONMENT == "production" ? process.env.MONGO_CONN : process.env.MONGO_CONN_LOCAL;

const connectionOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

async function deActivateAllCustomers() {
    try {
        if (!mongoURI) throw new Error('MONGODB_URI not found in environment variables');

        console.log("[Cron] Connecting to MongoDB...");
        await mongoose.connect(mongoURI, connectionOptions);
        console.log("[Cron] MongoDB connection established");

        const { modifiedCount } = await CustomerModel.updateMany(
            { isActive: true },
            { $set: { isActive: false } }
        );
        console.log(`[Cron] Deactivated ${modifiedCount} customers`);

    } catch (error) {
        console.error("[Cron] Error:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect().catch(() => { });
        process.exit();
    }
}

deActivateAllCustomers();