const CustomerModel = require("../Models/CustomerModel");

async function deActivateAllCustomers() {
    console.log("[Cron] Running monthly deactivation...");
    const { modifiedCount } = await CustomerModel.updateMany(
        { isActive: true },
        { $set: { isActive: false } }
    );
    console.log(`[Cron] Deactivated ${modifiedCount} customers`);

}

// Run once (PM2 will restart it on schedule)
deActivateAllCustomers().then(() => process.exit(0));