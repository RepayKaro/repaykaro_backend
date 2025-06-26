const cron = require("node-cron");
const CustomerModel = require("../Models/Customer");

// Schedule: Every last day of the month at 23:59:59
// cron.schedule("59 59 23 28-31 * *", async () => {
//   const now = new Date();
//   const tomorrow = new Date(now);
//   tomorrow.setDate(now.getDate() + 1);

//   // Check if tomorrow is 1st → means today is last day
//   if (tomorrow.getDate() === 1) {
//     try {
//       const result = await CustomerModel.updateMany(
//         {},
//         { $set: { isActive: false } }
//       );
//       console.log(
//         `[${new Date().toISOString()}] Updated ${
//           result.modifiedCount
//         } customers`
//       );
//     } catch (error) {
//       console.error("Cron job error:", error);
//     }
//   }
// });
