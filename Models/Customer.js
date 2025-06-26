const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CustomerSchema = new Schema(
  {
    customer: {
      type: String,
      required: true,
      comment: "Customer's full name",
    },

    phone: {
      type: String,
      required: true,
      comment: "Customer's phone number",
    },
    fore_closure: {
      type: String,
      required: true,
      comment: "Foreclosure status (e.g., pending, completed)",
    },
    settlement: {
      type: mongoose.Types.Decimal128, // Supports decimal values like 121.343
      default: 0.0,
      comment: "Total settlement amount",
    },
    minimum_part_payment: {
      type: mongoose.Types.Decimal128,
      default: 0.0,
      comment: "Amount paid in parts",
    },
    foreclosure_reward: {
      type: mongoose.Types.Decimal128,
      default: 0.0,
      comment: "Reward points for foreclosure",
    },
    settlement_reward: {
      type: mongoose.Types.Decimal128,
      default: 0.0,
      comment: "Reward points for settlement",
    },
    minimum_part_payment_reward: {
      type: mongoose.Types.Decimal128,
      default: 0.0,
      comment: "Reward points for part payment",
    },
    payment_type: {
      type: Number,
      enum: [0, 1, 2, 3], // Allowed values
      default: 0, // 0 means no payment made
      comment:
        "Payment type: 0 - No Payment, 1 - Foreclosure, 2 - Settlement, 3 - Part Payment",
    },
    isPaid: {
      type: Boolean,
      default: false,
      comment: "Indicates if the customer has completed the payment",
    },
    payment_url: {
      type: String,
      default: null,
      comment: "URL for online payment (if applicable)",
    },
    isLogin: {
      type: Boolean,
      default: false,
      comment: "Tracks if the customer has logged into the platform",
    },
    last_login: {
      type: Date,
      default: null,
      comment: "Records the last login time of the customer",
    },
    otp: {
      type: Number,
      default: false,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
     lender_name: {
      type: String,
      required: true,
      default:"RepayKaro",
      comment: "Lender name ",
    },
  },
  { timestamps: true }
);

const CustomerModel = mongoose.model("customers", CustomerSchema);
module.exports = CustomerModel;
