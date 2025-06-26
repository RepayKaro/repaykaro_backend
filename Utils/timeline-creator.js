const CustomerTimeline = require("../Models/CustomerTimeline");
const dotenv = require("dotenv");
require("dotenv").config();

const uploadTimeline = async (id,action, title, description) => {
  try {
    const newTimeline = await CustomerTimeline.create({
      customer_id: id,
      action:action,
      title: title,
      description: description,
    });

    return newTimeline ? true : false;
  } catch (error) {
    console.error(`Error on creation of timeline`, error.message);
    throw error;
  }
};
const deleteTimeline = async (id, title, description) => {
  try {
    const newTimeline = await CustomerTimeline.create({
      customer_id: id,
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
