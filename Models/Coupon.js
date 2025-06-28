const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CouponSchema = new Schema({  
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
