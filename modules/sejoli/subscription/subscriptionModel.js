const fn = require('../../../common/fn');

exports.getSubs = async (dt) => {
  if (dt.err) {
    dt.flow.push("❌ subscriptionModel.js | bypass getSubs");
    return dt;
  }
  dt.flow.push("➡️ subscriptionModel.js | start getSubs");

  // 1) parse limit & offset
  const rawLimit = dt.req_query?.limit;
  const rawOffset = dt.req_query?.offset;
  const parsedLimit = parseInt(rawLimit, 10);
  const parsedOffset = parseInt(rawOffset, 10);

  const useLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
  const useOffset =
    Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  dt.flow.push(`🔍 subscriptionModel.js | limit: ${useLimit}, offset: ${useOffset}`);

  // 2) build WHERE clause berdasarkan filter
  const filters = dt.req_query || {};
  const where   = [];
  const values  = [];

  if (filters.ID) {
    where.push("s.ID = ?");
    values.push(filters.ID);
  }
  if (filters.status) {
    where.push("s.status = ?");
    values.push(filters.status);
  }
  if (filters.user_id) {
    if (isNaN(filters.user_id)) {
      // cari ID user berdasarkan display_name
      const [[user]] = await fn.db.query(
        "SELECT ID FROM wp_users WHERE display_name = ?",
        [filters.user_id]
      );
      if (user) {
        where.push("s.user_id = ?");
        values.push(user.ID);
      } else {
        dt.flow.push("❌ user_id tidak ditemukan");
        dt.err = true;
        dt.code = 404;
        return dt;
      }
    } else {
      where.push("s.user_id = ?");
      values.push(filters.user_id);
    }
  }
  if (filters.affiliate_id) {
    where.push("s.affiliate_id = ?");
    values.push(filters.affiliate_id);
  }
  if (filters.product_id) {
    where.push("s.product_id = ?");
    values.push(filters.product_id);
  }
  if (filters["date-range"]) {
    const [startDate, endDate] = filters["date-range"].split(" - ");
    where.push("DATE(s.created_at) BETWEEN ? AND ?");
    values.push(startDate, endDate);
  }
  // contoh filter tambahan: expired / active
  if (filters.active === "true") {
    where.push("s.end_date >= CURDATE()");
  } else if (filters.active === "false") {
    where.push("s.end_date < CURDATE()");
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // 3) hitung totalRows
  let totalRows = 0;
  try {
    const countSQL = `
      SELECT COUNT(*) AS total
      FROM wp_sejolisa_subscriptions s
      JOIN wp_users u ON s.user_id = u.ID
      JOIN wp_posts p ON s.product_id = p.ID
      ${whereClause}
    `;
    const [[{ total }]] = await fn.db.query(countSQL, values);
    totalRows = total;
  } catch (err) {
    console.error("❌ subscriptionModel.js | COUNT ERROR:", err);
    dt.flow.push("❌ subscriptionModel.js | Error counting rows. " + err);
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  // 4) query data aktual
  const sql = `
    SELECT
      s.*,
      u.display_name,
      u.user_email,
      p.post_title AS product_name
    FROM wp_sejolisa_subscriptions s
    JOIN wp_users u ON s.user_id = u.ID
    JOIN wp_posts p ON s.product_id = p.ID
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ?, ?
  `;
  // untuk LIMIT dan OFFSET
  values.push(useOffset, useLimit !== null ? useLimit : totalRows);

  let rows = [];
  try {
    [rows] = await fn.db.query(sql, values);
  } catch (err) {
    console.error("❌ subscriptionModel.js | SQL ERROR:", err);
    dt.flow.push("❌ subscriptionModel.js | Error querying database. " + err);
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  if (!rows.length) {
    dt.flow.push("❌ subscriptionModel.js | Tidak ada data ditemukan di DB.");
    dt.err = true;
    dt.code = 404;
    return dt;
  }

  // 5) assign hasil
  dt.data  = rows;
  dt.total = totalRows;
  dt.flow.push(`✅ subscriptionModel.js | rows=${rows.length} of ${totalRows}`);
  dt.err   = false;
  return dt;
};


exports.updateSubsStatus = async (dt) => {
  const { ID, status } = dt.req_body;

  if (!ID || !Array.isArray(ID) || ID.length === 0 || !status) {
    dt.err = true;
    dt.code = 400;
    dt.flow.push("❌ subscriptionModel.js | status & ID are required");
    return dt;
  }

  try {
    const placeholders = ID.map(() => "?").join(", ");
    const values = [status, ...ID];

    const allowedStatuses = ["active", "inactive", "not-active",];

    // validasi status
    if (!allowedStatuses.includes(status)) {
      dt.flow.push(`❌ subscriptionModel.js | Invalid status: ${status}`);
      dt.err = true;
      dt.code = 400;
      return dt;
    }

    await fn.db.query(
      `UPDATE wp_sejolisa_subscriptions SET status = ? WHERE id IN (${placeholders})`,
      values
    );
  } catch (error) {
    dt.flow.push(
      "❌ subscriptionModel.js | Error querying database. " + error.toString()
    );
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  dt.data = {
    ID,
    status,
  };
  dt.flow.push(`✅ subscriptionModel.js | ${ID.length} order(s) updated`);
  dt.err = false;

  return dt;
};
