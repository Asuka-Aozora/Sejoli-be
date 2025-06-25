const fn = require("../../../../common/fn");

// salesModel.js
exports.getProduct = async (dt) => {
  if (dt.err) {
    dt.flow.push("❌ salesModel.js | bypass getProducts");
    return dt;
  }
  dt.flow.push("➡️ salesModel.js | start getProducts");

  let rows;
  try {
    [rows] = await fn.db.query(`
      SELECT
        p.ID,
        p.post_title   AS product_name
      FROM wp_posts p
      JOIN wp_posts p ON o.product_id = p.ID
    `);
  } catch (error) {
    dt.flow.push("❌ salesModel.js | Error querying products. " + error);
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  if (!rows.length) {
    dt.flow.push("❌ salesModel.js | No products found.");
    dt.err = true;
    dt.code = 404;
    return dt;
  }

  dt.data = rows; 
  dt.flow.push(`✅ salesModel.js | Found ${rows.length} products`);
  dt.err = false;
  return dt;
};
