const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CouponEncryptionSchema = new Schema({
    encrypted_code: {
        type: String,
        required: true,
        comment: "Encrypted coupon code",
    }

}, { timestamps: true });

const CouponEncryptionModel = mongoose.model('couponencryptions', CouponEncryptionSchema);
module.exports = CouponEncryptionModel;
