const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InquirySchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    message: {
      type: String,
      required: true,
      comment: "Message or inquiry details from the user",
    },
    isFollowedUp: {
      type: Boolean,
      default: false,
      comment: "Tracks if the inquiry has been followed up",
    },
    caseClosed: {
      type: Boolean,
      default: false,
      comment: "Tracks if the inquiry case has been closed",
    },
  },
  { timestamps: true }
);

const InquiryModel = mongoose.model("inquiry", InquirySchema);
module.exports = InquiryModel;
