const fn = require("../../../common/fn");

exports.getOrder = async (dt) => {
  // 0) Bypass jika sudah error
  if (dt.err) {
    dt.flow.push("❌ salesModel.js | bypass getOrder");
    return dt;
  }
  dt.flow.push("➡️ salesModel.js | start getOrder");

  // 1) Ambil & parse limit & offset, dengan fallback
  const rawLimit = dt.req_query?.limit;
  const rawOffset = dt.req_query?.offset;
  const parsedLimit = parseInt(rawLimit, 10);
  const parsedOffset = parseInt(rawOffset, 10);

  const useLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
  const useOffset =
    Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  dt.flow.push(`🔍 salesModel.js | limit: ${useLimit}, offset: ${useOffset}`);

  // 2) Bangun SQL + params
  let sql = `
    SELECT
      o.*,
      u.display_name,
      u.user_email,
      p.post_title AS product_name
    FROM wp_sejolisa_orders o
    JOIN wp_users  u ON o.user_id    = u.ID
    JOIN wp_posts  p ON o.product_id = p.ID
  `;
  const params = [];

  if (useLimit !== null) {
    // Jika ada limit, untuk pagination
    sql += ` ORDER BY o.created_at DESC LIMIT ?, ?`;
    params.push(useOffset, useLimit);
  }

  // 3) Debug SQL sebelum eksekusi
  console.log("🔍 salesModel.js | final SQL:", sql);
  console.log("🔍 salesModel.js | params:", params);

  // 4) Query database
  let rows = [];
  try {
    [rows] = await fn.db.query(sql, params);
  } catch (error) {
    console.error("❌ salesModel.js | SQL ERROR:", error);
    dt.flow.push("❌ salesModel.js | Error querying database. " + error);
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  // 5) Guard clause: jika tidak ada data
  if (!rows || rows.length === 0) {
    dt.flow.push("❌ salesModel.js | Tidak ada data ditemukan di DB.");
    dt.err = true;
    dt.code = 404;
    return dt;
  }

  // 6) Format hasil
  dt.data = rows;
  dt.flow.push(`✅ salesModel.js | data orders found (count: ${rows.length})`);
  dt.err = false;
  return dt;
};

exports.updateOrderStatus = async (dt) => {
  const { ID, status } = dt.req_body;

  if (!ID || !Array.isArray(ID) || ID.length === 0 || !status) {
    dt.err = true;
    dt.code = 400;
    dt.flow.push("❌ salesModel.js | status & ID are required");
    return dt;
  }

  try {
    const placeholders = ID.map(() => "?").join(", ");
    const values = [status, ...ID];

    const allowedStatuses = [
      "on-hold",
      "payment-confirm",
      "in-progress",
      "shipping",
      "completed",
      "refunded",
      "cancelled",
      "resend",
    ];

    // validasi status
    if (!allowedStatuses.includes(status)) {
      dt.flow.push(`❌ salesModel.js | Invalid status: ${status}`);
      dt.err = true;
      dt.code = 400;
      return dt;
    }

    await fn.db.query(
      `UPDATE wp_sejolisa_orders SET status = ? WHERE id IN (${placeholders})`,
      values
    );
  } catch (error) {
    dt.flow.push(
      "❌ salesModel.js | Error querying database. " + error.toString()
    );
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  dt.data = {
    ID,
    status,
  };
  dt.flow.push(`✅ salesModel.js | ${ID.length} order(s) updated`);
  dt.err = false;

  return dt;
};
