const UserModel = require("../Models/User");

const dotenv = require("dotenv");
require("dotenv").config();
// 🔧 Get user name by ID
const getUserNameById = async (id) => {
    try {
        const user = await UserModel.findById(id).lean();
        if (!user) {
            throw new Error("User does not exist");
        }
        return user.name;
    } catch (error) {
        console.error(`Error in getUserNameById:`, error.message);
        throw error;
    }
};

// 🔧 Get user name by Phone
const getUserNameByPhone = async (phone) => {
    try {
        const user = await UserModel.findOne({ phone }).lean();
        if (!user) {
            throw new Error("User does not exist");
        }
        return user.name;
    } catch (error) {
        console.error(`Error in getUserNameByPhone:`, error.message);
        throw error;
    }
};



module.exports = {
    getUserNameById,
    getUserNameByPhone,

};