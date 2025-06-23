const fn = require("../../../common/fn");

exports.getOrder = async (dt) => {
  if (dt.err) {
    dt.flow.push("❌ salesModel.js | bypass getOrder");
    return dt;
  }
  dt.flow.push("➡️ salesModel.js | start getOrder");

  const rawLimit = dt.req_query?.limit;
  const rawOffset = dt.req_query?.offset;
  const parsedLimit = parseInt(rawLimit, 10);
  const parsedOffset = parseInt(rawOffset, 10);

  const useLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
  const useOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  dt.flow.push(`🔍 salesModel.js | limit: ${useLimit}, offset: ${useOffset}`);

  // 1) Filter handling
  const filters = dt.req_query || {};
  const where = [];
  const values = [];

  if (filters.ID) {
    where.push("o.ID = ?");
    values.push(filters.ID); // FIX: sebelumnya typo "IS"
  }
  if (filters.status) {
    where.push("o.status = ?");
    values.push(filters.status);
  }
  if (filters.user_id) {
    where.push("o.user_id = ?");
    values.push(filters.user_id);
  }
  if (filters.affiliate_id) {
    where.push("o.affiliate_id = ?");
    values.push(filters.affiliate_id);
  }
  if (filters.product_id) {
    where.push("o.product_id = ?");
    values.push(filters.product_id);
  }
  if (filters.type) {
    where.push("o.type = ?");
    values.push(filters.type);
  }
  if (filters["grand_total"]) {
    where.push("o.grand_total = ?");
    values.push(filters["grand_total"]);
  }
  if (filters["date-range"]) {
    filters["date-range"] = filters["date-range"].replace(/\s*\+\s*/g, " - ")
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  // 2) Total Rows Count
  let totalRows = 0;
  try {
    const countSQL = `
      SELECT COUNT(*) AS total
      FROM wp_sejolisa_orders o
      JOIN wp_users u ON o.user_id = u.ID
      JOIN wp_posts p ON o.product_id = p.ID
      ${whereClause}
    `;
    const [[{ total }]] = await fn.db.query(countSQL, values);
    totalRows = total;
  } catch (err) {
    console.error("❌ salesModel.js | COUNT ERROR:", err);
    dt.flow.push("❌ salesModel.js | Error counting rows. " + err);
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  // 3) Final query
  const sql = `
    SELECT
      o.*, u.display_name, u.user_email,
      p.post_title AS product_name
    FROM wp_sejolisa_orders o
    JOIN wp_users u ON o.user_id = u.ID
    JOIN wp_posts p ON o.product_id = p.ID
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ?, ?
  `;
  values.push(useOffset, useLimit !== null ? useLimit : totalRows);

  let rows = [];
  try {
    [rows] = await fn.db.query(sql, values);
  } catch (error) {
    console.error("❌ salesModel.js | SQL ERROR:", error);
    dt.flow.push("❌ salesModel.js | Error querying database. " + error);
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  if (!rows || rows.length === 0) {
    dt.flow.push("❌ salesModel.js | Tidak ada data ditemukan di DB.");
    dt.err = true;
    dt.code = 404;
    return dt;
  }

  dt.data = rows;
  dt.total = totalRows;
  dt.flow.push(`✅ salesModel.js | rows=${rows.length} of ${totalRows}`);
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
