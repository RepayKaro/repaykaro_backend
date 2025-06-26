const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      comment: "Tracks if the user has logged into the platform",
    },
    permissions: [
      {
        module: {
          type: String,
          required: true, // e.g., 'Project', 'Task'
        },
        actions: [
          {
            type: String,
            enum: ["create", "read", "update", "delete"],
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const UserModel = mongoose.model("users", UserSchema);
module.exports = UserModel;
