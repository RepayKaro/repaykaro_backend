const UserModel = require("../Models/User");
const CouponModel = require("../Models/Coupon");
const CustomerModel = require("../Models/Customer");

module.exports.dashboard = async (req, res) => {
  try {
    const [
      //COUNTS
      userCount,
      activeUserCount,
      inActiveUserCount,
      customerCount,
      piadCustomerCount,
      unPaidCustomerCount,
      fullPaymentTypeCustomerCount,
      settlementPaymentTypeCustomerCount,
      partialPaymentTypeCustomerCount,
      //Payment sum
      foreClosureResult,
      sumPaidForeClosureResult,
      settlementResult,
      sumPaidSettlementResult,
      partialResult,
      sumPartialResult,
    ] = await Promise.all([
      // User stats
      UserModel.countDocuments(),
      UserModel.countDocuments({ isActive: true }),
      UserModel.countDocuments({ isActive: false }),

      // Customer stats
      CustomerModel.countDocuments({ isActive: true }),
      CustomerModel.countDocuments({ isPaid: true, isActive: true }),
      CustomerModel.countDocuments({ isPaid: false, isActive: true }),
      CustomerModel.countDocuments({ payment_type: 1, isActive: true }),
      CustomerModel.countDocuments({ payment_type: 2, isActive: true }),
      CustomerModel.countDocuments({ payment_type: 3, isActive: true }),

      // Sum of Foreclosure (all customers)
      CustomerModel.aggregate([
        {
          $match: {
            isActive: true,
          },
        },

        {
          $group: {
            _id: null,

            foreClosureSum: { $sum: { $toDouble: "$fore_closure" } },
          },
        },
      ]),

      // Foreclosure (only paid + full payment type)
      CustomerModel.aggregate([
        {
          $match: {
            isPaid: true,
            payment_type: 1,
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            paidForeClosureSum: { $sum: { $toDouble: "$fore_closure" } },
          },
        },
      ]),

      // Sum of Settlement (all customers)
      CustomerModel.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            settlementSum: { $sum: { $toDouble: "$settlement" } },
          },
        },
      ]),
      // Settlement (only paid + settlement payment type)
      CustomerModel.aggregate([
        {
          $match: {
            isPaid: true,
            payment_type: 2,
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            paidSettlementSum: { $sum: { $toDouble: "$settlement" } },
          },
        },
      ]),

      // Sum of Partial (all customers)
      CustomerModel.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            partialSum: { $sum: { $toDouble: "$minimum_part_payment" } },
          },
        },
      ]),
      // Partial (only paid + partial payment type)
      CustomerModel.aggregate([
        {
          $match: {
            isPaid: true,
            payment_type: 3,
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            paidPartialSum: { $sum: { $toDouble: "$minimum_part_payment" } },
          },
        },
      ]),
    ]);

    // Safe extraction
    const foreClosureSum = foreClosureResult[0]?.foreClosureSum || 0;
    const paidForeClosureSum =
      sumPaidForeClosureResult[0]?.paidForeClosureSum || 0;
    const settlementSum = settlementResult[0]?.settlementSum || 0;
    const paidSettlementSum =
      sumPaidSettlementResult[0]?.paidSettlementSum || 0;
    const partialSum = partialResult[0]?.partialSum || 0;
    const paidPartialSum = sumPartialResult[0]?.paidPartialSum || 0;

    const data = {
      users: {
        activeUserCount: activeUserCount,
        inActiveUserCount: inActiveUserCount,
        userCount: userCount,
      },
      customers: {
        customerCount: customerCount,
        piadCustomerCount: piadCustomerCount,
        unPaidCustomerCount: unPaidCustomerCount,
        fullPaymentTypeCustomerCount: fullPaymentTypeCustomerCount,
        settlementPaymentTypeCustomerCount: settlementPaymentTypeCustomerCount,
        partialPaymentTypeCustomerCount: partialPaymentTypeCustomerCount,
      },
      payments: {
        foreClosureSum: foreClosureSum.toFixed(2),
        paidForeClosureSum: paidForeClosureSum.toFixed(2),
        settlementSum: settlementSum.toFixed(2),
        paidSettlementSum: paidSettlementSum.toFixed(2),
        partialSum: partialSum.toFixed(2),
        paidPartialSum: paidPartialSum.toFixed(2),
      },
    };

    return res.status(200).json({
      data,
      message: userCount ? "User Found" : "No User Found",
      success: true,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
