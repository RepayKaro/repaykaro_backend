const CustomerModel = require("../Models/Customer");
const Joi = require("joi");
const { getUserNameById, getUserNameByPhone } = require('../Utils/helper-function');
const { Buffer } = require("buffer");

const BATCH_SIZE = 5000;
const uuid = require("uuid").v4;
const fs = require("fs");
const path = require("path");


module.exports.uploadCustomers = async (req, res) => {
  const uploadId = uuid(); // unique identifier for each upload
  console.time(`📥 Excel Upload ${uploadId}`);

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded", success: false });
    }

    const xlsx = require("xlsx");
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];

    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,
      defval: "",
    });

    if (!rawData.length) {
      return res.status(400).json({ message: "File is empty", success: false });
    }

    // === Step 1: Clean and Normalize ===
    const formatNumber = (value) => parseFloat(value || 0).toFixed(2);
    const normalizePhone = (phone) =>
      String(phone || "")
        .replace(/\s+/g, "")
        .trim();

    const normalizedData = rawData.map((row) => {
      const cleanedRow = {};
      for (const key in row) {
        cleanedRow[key.trim()] = row[key];
      }
      return {
        ...cleanedRow,
        foreclosure_reward: formatNumber(cleanedRow.foreclosure_reward),
        fore_closure: formatNumber(cleanedRow.fore_closure),
        settlement: formatNumber(cleanedRow.settlement),
        minimum_part_payment: formatNumber(cleanedRow.minimum_part_payment),
        settlement_reward: formatNumber(cleanedRow.settlement_reward),
        minimum_part_payment_reward: formatNumber(
          cleanedRow.minimum_part_payment_reward
        ),
        phone: normalizePhone(cleanedRow.phone),
      };
    });

    // === Step 2: Filter out empty phones ===
    const validCustomers = normalizedData.filter((c) => !!c.phone);

    // === Step 3: Deduplicate by phone ===
    const seen = new Set();
    const uniqueCustomers = [];
    for (const cust of validCustomers) {
      if (!seen.has(cust.phone)) {
        seen.add(cust.phone);
        uniqueCustomers.push(cust);
      }
    }

    if (!uniqueCustomers.length) {
      return res.status(400).json({
        message: "All phone numbers are duplicates or missing",
        success: false,
      });
    }

    // === Step 4: Respond Early ===
    res.status(202).json({
      message: "Customer upload started",
      totalUploaded: uniqueCustomers.length,
      success: true,
    });

    // === Step 5: Background Insert Task ===
    setImmediate(async () => {
      try {
        console.time(`🔍 DB Check & Insert ${uploadId}`);

        const phones = uniqueCustomers.map((c) => c.phone);

        const phoneToCustomerMap = new Map();
        uniqueCustomers.forEach((c) => {
          phoneToCustomerMap.set(c.phone, c); // overwrite in case of duplicates in Excel
        });

        const allPhones = Array.from(phoneToCustomerMap.keys());

        // Step 1: Find existing records
        const existingRecords = await CustomerModel.find(
          { phone: { $in: allPhones }, isActive: true },
          { phone: 1 }
        ).lean();

        const existingPhones = new Set(existingRecords.map((c) => c.phone));
        const phonesToUpdate = Array.from(existingPhones);

        // Step 2: Deactivate existing customers
        if (phonesToUpdate.length > 0) {
          const updateRes = await CustomerModel.updateMany(
            { phone: { $in: phonesToUpdate }, isActive: true },
            { $set: { isActive: false } }
          );
          console.log(`🛑 Deactivated ${updateRes.modifiedCount} existing customers`);
        }
        console.log(allPhones)

        // Step 3: Prepare new customer records
        const newCustomers = allPhones.map((phone) => ({
          ...phoneToCustomerMap.get(phone),
          isActive: true, // ensure new ones are active
        }));

        // Step 4: Insert in chunks
        let totalInserted = 0;
        for (let i = 0; i < newCustomers.length; i += BATCH_SIZE) {
          const chunk = newCustomers.slice(i, i + BATCH_SIZE);
          try {
            const res = await CustomerModel.insertMany(chunk, { ordered: false });
            console.log(`✅ Inserted ${res.length} in chunk #${i / BATCH_SIZE + 1}`);
            totalInserted += res.length;
          } catch (err) {
            console.error(
              `❌ Failed to insert chunk #${i / BATCH_SIZE + 1}`,
              err.message
            );
          }
        }

        console.log(
          `✅ [${uploadId}] Finished inserting ${totalInserted} new customers.`
        );
        console.timeEnd(`🔍 DB Check & Insert ${uploadId}`);
        console.timeEnd(`📥 Excel Upload ${uploadId}`);

        // Delete uploaded Excel file
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error(`⚠️ Failed to delete file: ${req.file.path}`, err.message);
          } else {
            console.log(`🧹 Successfully deleted uploaded file: ${req.file.path}`);
          }
        });

      } catch (bgErr) {
        console.error(`❌ Background Upload Error [${uploadId}]:`, bgErr.message);
        console.timeEnd(`📥 Excel Upload ${uploadId}`);
      }
    });

  } catch (err) {
    console.error(`❌ Upload API Error [${uploadId}]:`, err.message);
    console.timeEnd(`📥 Excel Upload ${uploadId}`);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};
module.exports.customerList = async (req, res) => {
  try {
    const {
      customer,
      filter,
      phone,
      page = 1,
      perPage = 10,
      lender
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page));
    const showAll = perPage === "All";
    const limit = showAll ? null : Math.max(1, parseInt(perPage));
    const skip = showAll ? 0 : (pageNumber - 1) * limit;

    // 1. Base filters
    const filterQuery = {
      isActive: true,
      ...(filter === "0" && { isPaid: false }),
      ...(filter === "1" && { isPaid: true }),
      ...(filter === "3" && { isLogin: true }),
      ...(phone && { phone })
    };

    // 2. Build Atlas $search conditions
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

    const pipeline = [];

    // 3. $search Stage First (if needed)
    if (searchConditions.length) {
      pipeline.push({
        $search: {
          index: "default", // your Atlas Search index name
          compound: {
            must: searchConditions
          }
        }
      });
    }

    // 4. $match for other filters (phone, isPaid, isLogin)
    if (Object.keys(filterQuery).length) {
      pipeline.push({ $match: filterQuery });
    }

    // 5. Join with payments
    pipeline.push({
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

    // 6. Match only customers with payments if filter === '1'
    if (filter === "1") {
      pipeline.push({
        $match: {
          "payments.0": { $exists: true }
        }
      });
    }

    // 7. Pagination
    if (!showAll) {
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
    }

    // 8. Clean projection
    pipeline.push({
      $project: {
        otp: 0,
        __v: 0
      }
    });

    // 9. Run both aggregate and count in parallel
    const [rawData, totalRecords] = await Promise.all([
      CustomerModel.aggregate(pipeline).exec(),

      CustomerModel.aggregate([
        ...(searchConditions.length
          ? [{
            $search: {
              index: "default",
              compound: {
                must: searchConditions
              }
            }
          }]
          : []),
        ...(Object.keys(filterQuery).length ? [{ $match: filterQuery }] : []),
        ...(filter === "1"
          ? [
            {
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
            },
            { $match: { "payments.0": { $exists: true } } }
          ]
          : []),
        { $count: "count" }
      ]).then(res => res[0]?.count || 0)
    ]);

    // Resolve verified_by names
    const data = await Promise.all(
      rawData.map(async (customer) => {
        if (customer.verified_by) {
          try {
            customer.verified_by = await getUserNameById(customer.verified_by);
          } catch (err) {
            customer.verified_by = "";
          }
        }
        return customer;
      })
    );


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
    const { phone } = req.params;

    // Decode from base64
    const decoded = Buffer.from(phone.trim(), 'base64').toString('utf8');

    // Validate phone format
    const cleanPhone = decoded.replace(/\D/g, '');

    // MongoDB optimized indexed search
    const customer = await CustomerModel.findOne({ phone: cleanPhone }).lean(); // `lean()` is faster

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
console.log("customer",customer)
    return res.status(200).json({ success: true, customer, message: "Customer  found" });
  } catch (error) {
    console.error("Fetch error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




//test comment
