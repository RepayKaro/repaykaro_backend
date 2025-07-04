const CustomerModel = require("../Models/Customer");
const CouponModel = require("../Models/Coupon");
const PaymentModel = require("../Models/Payment");
const Joi = require("joi");
const { getUserNameById, getUserNameByPhone } = require('../Utils/helper-function');
const { Buffer } = require("buffer");

const BATCH_SIZE = 5000;
const uuid = require("uuid").v4;
const fs = require("fs");
const path = require("path");

const ExcelJS = require("exceljs");

module.exports.uploadCustomers = async (req, res) => {
  const uploadId = uuid();
  console.time(`📥 Excel Upload ${uploadId}`);

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded", success: false });
    }

    const formatNumber = (value) => parseFloat(value || 0).toFixed(2);
    const formatNumber1 = (value) => {
      if (!value) return 0;
      const floatedValue = parseFloat(value || 0).toFixed(2);
      return Math.floor(Number(floatedValue));
    };
    const normalizePhone = (phone) =>
      String(phone || "")
        .replace(/\s+/g, "")
        .trim();

    const phoneToCustomerMap = new Map();
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1); // first sheet

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const cleanedRow = {};
      row.eachCell((cell, colNumber) => {
        const header = worksheet.getRow(1).getCell(colNumber).value;
        cleanedRow[header.trim()] = cell.text;
      });

      const phone = normalizePhone(cleanedRow.phone);
      if (!phone) return;

      const customer = {
        ...cleanedRow,
        phone,
        fore_closure: formatNumber(cleanedRow.fore_closure),
        settlement: formatNumber(cleanedRow.settlement),
        minimum_part_payment: formatNumber(cleanedRow.minimum_part_payment),
        foreclosure_reward: formatNumber1(cleanedRow.foreclosure_reward),
        settlement_reward: formatNumber1(cleanedRow.settlement_reward),
        minimum_part_payment_reward: formatNumber1(cleanedRow.minimum_part_payment_reward),
      };

      phoneToCustomerMap.set(phone, customer); // deduplication
    });

    const allPhones = Array.from(phoneToCustomerMap.keys());
    const uniqueCustomers = Array.from(phoneToCustomerMap.values());

    if (!uniqueCustomers.length) {
      return res.status(400).json({
        message: "No valid customers found",
        success: false,
      });
    }

    res.status(202).json({
      message: "Customer upload started",
      totalUploaded: uniqueCustomers.length,
      success: true,
    });

    // Background task
    setImmediate(async () => {
      try {
        console.time(`🔍 DB Check & Insert ${uploadId}`);

        const existingRecords = await CustomerModel.find(
          { phone: { $in: allPhones }, isActive: true },
          { phone: 1 }
        ).lean();

        const existingPhones = new Set(existingRecords.map((c) => c.phone));

        if (existingPhones.size > 0) {
          const updateRes = await CustomerModel.updateMany(
            { phone: { $in: Array.from(existingPhones) }, isActive: true },
            { $set: { isActive: false } }
          );
          console.log(`🛑 Deactivated ${updateRes.modifiedCount} existing customers`);
        }

        const newCustomers = allPhones.map((phone) => ({
          ...phoneToCustomerMap.get(phone),
          isActive: true,
        }));

        let totalInserted = 0;
        for (let i = 0; i < newCustomers.length; i += BATCH_SIZE) {
          const chunk = newCustomers.slice(i, i + BATCH_SIZE);
          try {
            const res = await CustomerModel.insertMany(chunk, { ordered: false });
            console.log(`✅ Inserted ${res.length} in chunk #${i / BATCH_SIZE + 1}`);
            totalInserted += res.length;
          } catch (err) {
            console.error(`❌ Failed to insert chunk #${i / BATCH_SIZE + 1}`, err.message);
          }
        }

        console.log(`✅ [${uploadId}] Finished inserting ${totalInserted} new customers.`);
        console.timeEnd(`🔍 DB Check & Insert ${uploadId}`);
        console.timeEnd(`📥 Excel Upload ${uploadId}`);

        fs.unlink(req.file.path, (err) => {
          if (err) console.error(`⚠️ Failed to delete file:`, err.message);
          else console.log(`🧹 Deleted uploaded file`);
        });
      } catch (err) {
        console.error(`❌ Background Upload Error [${uploadId}]:`, err.message);
      }
    });
  } catch (err) {
    console.error(`❌ Upload API Error [${uploadId}]:`, err.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};
module.exports.customerList = async (req, res) => {
  try {
    const { customer, filter, phone, page = 1, type, perPage = 10, lender } = req.query;
    const pageNumber = Math.max(1, parseInt(page));
    const showAll = perPage === "All";
    const limit = showAll ? null : Math.max(1, parseInt(perPage));
    const skip = showAll ? 0 : (pageNumber - 1) * limit;

    // Build filter query (unchanged from your original)
    const filterQuery = {
      ...(type === "current-customers" && { isActive: true }),
      ...(filter === "0" && { isPaid: false }),
      ...(filter === "1" && { isPaid: true }),
      ...(filter === "3" && { isLogin: true }),
      ...(phone && { phone })
    };

    // Build search conditions (unchanged)
    const searchConditions = [];
    if (customer) {
      searchConditions.push({
        text: {
          query: customer,
          path: "customer"
        }
      });
    }
    if (lender) {
      searchConditions.push({
        text: {
          query: lender,
          path: "lender_name"
        }
      });
    }

    // Base pipeline (maintaining your exact logic)
    const basePipeline = [];

    if (searchConditions.length) {
      basePipeline.push({
        $search: {
          index: "default",
          compound: { must: searchConditions }
        }
      });
    }

    if (Object.keys(filterQuery).length) {
      basePipeline.push({ $match: filterQuery });
    }

    // Payment joins (unchanged logic)
    if (type === "current-customers") {
      basePipeline.push({
        $lookup: {
          from: "payments",
          let: { customerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$customer_id", "$$customerId"] },
                    { $eq: ["$isActive", true] }
                  ]
                }
              }
            }
          ],
          as: "payments"
        }
      });
    } else if (type === "total-customers") {
      basePipeline.push({
        $lookup: {
          from: "payments",
          let: { customerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$customer_id", "$$customerId"]
                }
              }
            }
          ],
          as: "payments"
        }
      });
    }

    // Payment filter (unchanged)
    if (filter === "1") {
      basePipeline.push({ $match: { "payments.0": { $exists: true } } });
    }

    // User lookup (unchanged)
    basePipeline.push({
      $lookup: {
        from: "users",
        localField: "verified_by",
        foreignField: "_id",
        as: "verified_user"
      }
    });

    basePipeline.push({
      $addFields: {
        verified_by: { $arrayElemAt: ["$verified_user.name", 0] }
      }
    });

    // Projection (unchanged)
    basePipeline.push({
      $project: {
        otp: 0,
        __v: 0,
        verified_user: 0
      }
    });

    // Sorting (unchanged)
    // basePipeline.push({
    //   $sort: { updatedAt: -1 }
    // });

    // Pagination (unchanged)
    if (!showAll) {
      basePipeline.push({ $skip: skip });
      basePipeline.push({ $limit: limit });
    }

    // Execute queries with memory optimizations
    const [data, totalResult] = await Promise.all([
      CustomerModel.collection.aggregate(basePipeline, { 
        allowDiskUse: true,
        maxTimeMS: 60000 // 1 minute timeout
      }).toArray(),
      
      CustomerModel.collection.aggregate([
        ...basePipeline.filter(stage => !["$skip", "$limit"].includes(Object.keys(stage)[0])),
        { $count: "count" }
      ], { 
        allowDiskUse: true 
      }).toArray()
    ]);

    const totalRecords = totalResult[0]?.count || 0;

    return res.status(200).json({
      success: true,
      totalRecords,
      currentPage: showAll ? 1 : pageNumber,
      perPage: showAll ? totalRecords : limit,
      data,
      message: data.length
        ? "Customers retrieved successfully"
        : "No customers found"
    });

  } catch (error) {
    console.error("Customer list error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { error: error.message })
    });
  }
};


module.exports.updateCustomerPayment = async (req, res) => {
  try {
    const { customer_id, payment_type } = req.body;

    if (!customer_id) {
      return res
        .status(400)
        .json({ message: "Customer Id is required", success: false });
    }
    const updatedCustomer = await CustomerModel.findOneAndUpdate(
      { _id: customer_id }, // Query condition
      { isPaid: true, payment_type: payment_type }, // Update data
      { new: true } // Return updated document
    );

    if (!updatedCustomer) {
      return res
        .status(404)
        .json({ message: "Customer not found", success: false });
    }

    return res.status(200).json({
      message: "Updated successfully",
      success: true,
      customer: updatedCustomer,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error failed to update customer payment",
      success: false,
      error: error.message,
    });
  }
};
module.exports.getCustomerDetails = async (req, res) => {
  try {
    // const phone = Buffer.from(req.params.phone, "base64").toString("utf8");
    const phone = req.params.phone;
    const allCustomers = await CustomerModel.find({ phone })
      .sort({ createdAt: -1 })
      .populate("verified_by", "name"); // ✅ only populate 'name'

    if (!allCustomers || allCustomers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No customers found for this phone number",
      });
    }

    // Use most recent customer as basic
    const recentCustomer = allCustomers[0];

    const customer_basic_details = {
      _id: recentCustomer._id,
      customer: recentCustomer.customer,
      phone: recentCustomer.phone,
      createdAt: recentCustomer.createdAt,
      updatedAt: recentCustomer.updatedAt,
    };

    const history = await Promise.all(
      allCustomers.map(async (cust) => {
        const coupon = await CouponModel.findOne({
          customer_id: cust._id.toString(),
          phone,
        }).sort({ createdAt: -1 });

        const screenshots = await PaymentModel.findOne({
          customer_id: cust._id,
          phone,
        }).sort({ createdAt: -1 });

        const customerData = {
          ...cust.toObject(),
          verified_by: cust.verified_by?.name || null, // ✅ replace ObjectId with name
        };

        return {
          customer: customerData,
          coupon: coupon || null,
          screenshots: screenshots || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      customer_basic_details,
      history,
    });
  } catch (err) {
    console.error("❌ Error in getCustomerDetailsByPhone:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
module.exports.testt = async (req, res) => {
  try {
    console.log("Test endpoint hit");



    return res.status(200).json({
      success: true,
      message: "Test endpoint successful",
    });
  } catch (err) {
    console.error("❌ Error in getCustomerDetailsByPhone:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
//test comment
