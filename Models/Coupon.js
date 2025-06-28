const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// const { v4: uuidv4 } = require('uuid');

const CouponSchema = new Schema({

    // reference_no: {
    //     type: String,
    //     default: uuidv4, // Generates a unique UUID for each customer
    //     unique: true, // Ensures uniqueness in the database
    //     required: true,
    //     comment: "Unique identifier for the customer"
    // },
    customer_id: {
        type: String,
        required: true,
        comment: "Customer's Id",
    },
    phone: {
        type: String,
        required: true,
        comment: "Customer's phone number",
        default: "0000000000"
    },
    coupon_code: {
        type: String,
        required: true,
        default: "FREE50",
        comment: "coupon code"
    },
    amount: {
        type: mongoose.Types.Decimal128, // Supports decimal values like 121.343
        default: 0.00,
        comment: "amount"
    },
    validity: {
        type: Number,
        default: 0,
        comment: "Coupon expiry validity"
    },
    isActive: {
        type: Number,
        default: 1,

    },
    scratched: {
        type: Number,
        default: 0,

    },
    redeemed: {
        type: Number,
        default: 0,

    },


}, { timestamps: true });

const CouponModel = mongoose.model('coupons', CouponSchema);
module.exports = CouponModel;
