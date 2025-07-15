const fn = require("../../../common/fn");

exports.getSubs = async (dt) => {
  if (dt.err) {
    dt.flow.push("❌ subscriptionModel.js | bypass getSubs");
    return dt;
  }

  dt.flow.push("➡️ subscriptionModel.js | start getSubs")
  const rawLimit = dt.req_query?.limit;
  const rawOffset = dt.req_query?.offset;
  const parsedLimit = parseInt(rawLimit, 10);
  const parsedOffset = parseInt(rawOffset, 10);

  const useLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
  const useOffset =
    Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  dt.flow.push(`🔍 salesModel.js | limit: ${useLimit}, offset: ${useOffset}`);

  // filters handling
  const filters = dt.req_query || {};
  const where = [];
  const values = [];

  if (filters.ID) {
    where.push("o.ID = ?");
    values.push(filters.ID);
  }
  if (filters.status) {
    where.push("o.status = ?");

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
        where.push("o.user_id = ?");
        values.push(user.ID);
      } else {
        // tidak ditemukan, maka kodongkan data
        dt.flow.push(" ❌ user_id tidak ditemukan");

        dt.err = true;
        dt.code = 404;
        return dt;
      }
    } else {
      where.push("o.user_id = ?");
      values.push(filters.user_id);
    }
  }
  if (filters.product_id) {
    where.push("o.product_id = ?");
    values.push(filters.product_id);
  }
  if (filters.type) {
    where.push("o.type = ?");
    values.push(filters.type);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";


  let totalRows = 0;
  try {
    const countSQL = `
      SELECT COUNT(*) AS total
      FROM wp_sejolisa_subscriptions o
      JOIN wp_users u ON o.user_id = u.ID
      JOIN wp_posts p ON o.product_id = p.ID
      ${whereClause}
    `;
    const [[{ total }]] = await fn.db.query(countSQL, values);
    totalRows = total;
  } catch (error) {
    console.error("❌ subscriptionModel.js | COUNT ERROR: ", error);
    dt.flow.push("❌ subscriptionModel.js | Error querying database. " + error);
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  // 4) query data aktual
  const sql = `
    SELECT o.*, u.display_name, u.user_email, p.post_title AS product_name
    FROM wp_sejolisa_subscriptions o
    JOIN wp_users u ON o.user_id = u.ID 
    JOIN wp_posts p ON o.product_id = p.ID
    ${whereClause}
    LIMIT ?, ?
  `;
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


  if (!rows || rows.length === 0) {
    dt.flow.push("❌ subscriptionModel.js | Tidak ada data ditemukan di DB.");
    dt.err = true;
    dt.code = 404;
    return dt;
  }


  // 5) assign hasil
  dt.data = rows;
  dt.total = totalRows;
  dt.flow.push("✅ subscriptionModel.js | Ditemukan " + totalRows + " data.");
  dt.err = false;
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

    const allowedStatuses = ["active", "inactive", "not-active"];
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
