const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CustomerTimelineSchema = new Schema(
  {
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      comment: "Customer's Id required",
    },
    action: {
      type: String,
      required: true,
      comment: "action",
    },


    title: {
      type: String,
      required: true,
      comment: "title",
    },

    description: {
      type: String,
      default: null,
      comment: "description",
    },
  },
  { timestamps: true }
);

const CustomerTimelineModel = mongoose.model(
  "customertimelines",
  CustomerTimelineSchema
);
module.exports = CustomerTimelineModel;
