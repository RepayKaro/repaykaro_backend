const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require("uuid");

const CustomerSchema = new Schema(
  {
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      comment: "Customer's Id required",
    },
    phone: {
      type: String,
      required: true,
      comment: "Customer's phone",
    },

    coupon_id: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: false,
      comment: "Coupon's Id required",
    },

    screen_shot: {
      type: String,
      default: null,
      comment: "Screenshot",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const PaymentModel = mongoose.model("payments", CustomerSchema);
module.exports = PaymentModel;
