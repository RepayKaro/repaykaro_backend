const CustomerModel = require("../Models/Customer");
const Joi = require("joi");

const BATCH_SIZE = 5000;
const uuid = require("uuid").v4;

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

        // Step 5.1: Check existing phones in DB
        const phones = uniqueCustomers.map((c) => c.phone);
        const existingPhoneSet = new Set();

        for (let i = 0; i < phones.length; i += BATCH_SIZE) {
          const chunk = phones.slice(i, i + BATCH_SIZE);
          const existing = await CustomerModel.find(
            { phone: { $in: chunk } },
            { phone: 1 }
          ).lean();
          existing.forEach((c) => existingPhoneSet.add(c.phone));
        }

        // Step 5.2: Keep only new customers
        const newCustomers = uniqueCustomers.filter(
          (c) => !existingPhoneSet.has(c.phone)
        );
        console.log(
          `📦 [${uploadId}] New customers to insert: ${newCustomers.length}`
        );

        if (!newCustomers.length) {
          console.log(`✅ [${uploadId}] All customers already exist in DB.`);
          console.timeEnd(`🔍 DB Check & Insert ${uploadId}`);
          console.timeEnd(`📥 Excel Upload ${uploadId}`);
          return;
        }

        // Step 5.3: Insert in chunks with try/catch
        let totalInserted = 0;

        for (let i = 0; i < newCustomers.length; i += BATCH_SIZE) {
          const chunk = newCustomers.slice(i, i + BATCH_SIZE);
          try {
            const res = await CustomerModel.insertMany(chunk, {
              ordered: false,
            });
            console.log(
              `✅ Inserted ${res.length} in chunk #${i / BATCH_SIZE + 1}`
            );
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
      } catch (bgErr) {
        console.error(
          `❌ Background Upload Error [${uploadId}]:`,
          bgErr.message
        );
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
    const [data, totalRecords] = await Promise.all([
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

//test comment
