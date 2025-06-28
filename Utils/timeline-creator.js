const CustomerTimeline = require("../Models/CustomerTimeline");
const dotenv = require("dotenv");
require("dotenv").config();

const uploadTimeline = async (
  phone,
  customer_id,
  action,
  title,
  description
) => {
  try {
    const newTimeline = await CustomerTimeline.create({
      phone: phone,
      customer_id: customer_id,
      action: action,
      title: title,
      description: description,
    });

    return newTimeline ? true : false;
  } catch (error) {
    console.error(`Error on creation of timeline`, error.message);
    throw error;
  }
};
const deleteTimeline = async (phone, title, description) => {
  try {
    const newTimeline = await CustomerTimeline.create({
      phone: phone,
      title: title,
      description: description,
    });

    return newTimeline ? true : false;
  } catch (error) {
    console.error(`Error on creation of timeline`, error.message);
    throw error;
  }
};

module.exports = {
  uploadTimeline,
  deleteTimeline,
};
