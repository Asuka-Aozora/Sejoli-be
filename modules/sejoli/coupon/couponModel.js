// couponModel.js
const fn = require("../../../common/fn");

exports.getCoupons = async (dt) => {
  if (dt.err) return dt;
  dt.flow.push("➡️ couponModel | start query coupons");

  // parse pagination
  const rawLimit = dt.req_query.limit;
  const rawOffset = dt.req_query.offset;
  const parsedLimit = parseInt(rawLimit, 10);
  const parsedOffset = parseInt(rawOffset, 10);

  const useLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
  const useOffset =
    Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  dt.flow.push(`🔍 couponModel | limit=${useLimit}, offset=${useOffset}`);

  // filter handling
  const filters = dt.req_query || {};
  const where = [];
  const vals = [];

  if (filters.ID) {
    where.push("c.ID = ?");
    vals.push(filters.ID);
  }
  if (filters.code) {
    where.push("c.code LIKE ?");
    vals.push(`%${filters.code}%`);
  }
  if (filters.owner_name) {
    where.push("u.display_name LIKE ?");
    vals.push(`%${filters.owner_name}%`);
  }
  if (filters.status) {
    where.push("c.status = ?");
    vals.push(filters.status);
  }
  if (filters.expiry_date) {
    // expects format "YYYY-MM-DD"
    where.push("DATE(c.expiry_date) = ?");
    vals.push(filters.expiry_date);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // total count
  try {
    const countSQL = `
      SELECT COUNT(*) AS total
      FROM wp_coupons c
      LEFT JOIN wp_users u ON c.owner_id = u.ID
      ${whereClause}
    `;
    const [[{ total }]] = await fn.db.query(countSQL, vals);
    dt.total = total;
    dt.flow.push(`✅ couponModel | totalRows=${total}`);
  } catch (err) {
    dt.err = true;
    dt.code = 500;
    dt.flow.push("❌ couponModel | count error: " + err.message);
    return dt;
  }

  // fetch data
  try {
    const sql = `
      SELECT
        c.ID,
        c.code,
        u.display_name AS owner_name,
        CONCAT(c.discount_type, '-', c.discount_value) AS discount,
        c.uses,
        c.status,
        c.expiry_date
      FROM wp_coupons c
      LEFT JOIN wp_users u ON c.owner_id = u.ID
      ${whereClause}
      ORDER BY c.expiry_date DESC
      LIMIT ?, ?
    `;
    vals.push(useOffset, useLimit !== null ? useLimit : dt.total);

    const [rows] = await fn.db.query(sql, vals);
    if (!rows.length) {
      dt.err = true;
      dt.code = 404;
      dt.flow.push("❌ couponModel | no coupons found");
      return dt;
    }

    dt.data = rows;
    dt.flow.push(`✅ couponModel | fetched ${rows.length} coupons`);
    dt.err = false;
  } catch (err) {
    dt.err = true;
    dt.code = 500;
    dt.flow.push("❌ couponModel | query error: " + err.message);
  }

  return dt;
};
