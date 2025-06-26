const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../Models/User");
module.exports.signup = async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    let insertData = req.body;

    const user = await UserModel.findOne({ email });
    if (user) {
      return res.status(409).json({
        message: "User is already exist, you can login",
        success: false,
      });
    }

    insertData.password = await bcrypt.hash(password, 10);

    await UserModel.create(insertData);

    return res.status(201).json({
      message: "User Created successfully",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      success: false,
      error: err.message, // Include error message for debugging
    });
  }
};
module.exports.userList = async (req, res) => {
  try {
    const { name, email, page = 1, perPage = 10 } = req.query;
console.log("req query user",req.query)
    let query = {};

    if (name) query.name = new RegExp(name, "i");
    if (email) query.email = new RegExp(email, "i"); // Case-insensitive search

    // Convert page and perPage to numbers
    const pageNumber = parseInt(page);
    const limit = parseInt(perPage);
    const skip = (pageNumber - 1) * limit;

    // Fetch paginated data
    const users = await UserModel.find(query)
      .select("-password -__v -permissions._id") // ✅ select() is part of the query chain
      .sort({ updatedAt: -1 }) // ✅ Sort by updatedAt descending
      .skip(skip)
      .limit(limit);
    const totalRecords = await UserModel.countDocuments(query);

    let message = totalRecords ? "User Found" : "No User Found";

    return res.status(200).json({
      totalRecords,
      message,
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports.updateUser = async (req, res) => {
  try {
    const { _id, name, email, password, isActive, permissions } = req.body;
    const isValidEmail = await UserModel.findOne({
      email: email,
      _id: { $ne: _id }, // Exclude the given _id
    });
    if (isValidEmail) {
      return res
        .status(409)
        .json({ message: "Email already Exists", success: false });
    }

    const updateData = { name, email, isActive, permissions };

    // Add password only if it's not empty
    if (password?.trim()) {
      updateData.password = await bcrypt.hash(password, 10); // Hash before saving in real cases
    }

    const updatedUser = await UserModel.findOneAndUpdate({ _id }, updateData, {
      new: true,
      projection: { password: 0 },
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "Customer not found", success: false });
    }

    return res.status(200).json({
      message: "Updated successfully",
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error failed to update user",
      success: false,
      error: error.message,
    });
  }
};

module.exports.getProfile = async (req, res) => {
  try {
    // console.log(req.user);
    const { _id } = req.user;
    const user = await UserModel.findById({ _id }).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "User found successfully",
      success: true,
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error failed to update user",
      success: false,
      error: error.message,
    });
  }
};
module.exports.getProfileById = async (req, res) => {
  try {
    // console.log(req.user);
    const { id } = req.params;
    const user = await UserModel.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "User found successfully",
      success: true,
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error failed to update user",
      success: false,
      error: error.message,
    });
  }
};
