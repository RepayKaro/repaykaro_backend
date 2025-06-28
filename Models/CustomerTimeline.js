const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CustomerTimelineSchema = new Schema(
  {
     customer_id: {
        type: String,
        required: true,
        comment: "Customer's Id",
    },
    phone: {
      type: String,
      required: true,
      comment: "Customer's phone required",
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
