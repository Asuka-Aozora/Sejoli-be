const fn = require('../../../common/fn');

exports.getLicense = async (dt) => {
  if (dt.err) {
    dt.flow.push("❌ licenseModel.js | bypass getLicense");
    return dt;
  }
  dt.flow.push("➡️ licenseModel.js | start getLicense");

  try {
    // Query: ambil kolom ID, status, code dari licenses,
    // display_name & email dari users,
    // dan post_title dari products (wp_posts)
    const [rows] = await fn.db.query(`
        SELECT
          l.ID,
          l.status,
          u.display_name,
          u.user_email    AS email,
          l.code,
          p.post_title   AS product_name
        FROM wp_sejolisa_licenses l
        JOIN wp_users u      ON l.user_id    = u.ID
        JOIN wp_posts p      ON l.product_id = p.ID
      `);

    if (!rows || rows.length === 0) {
      dt.flow.push("❌ licenseModel.js | Tidak ada data ditemukan di DB.");
      dt.err = true;
      dt.code = 404;
      return dt;
    }

    dt.data = rows;
    dt.flow.push(`✅ licenseModel.js | Ditemukan ${rows.length} license(s)`);
    dt.err = false;
    return dt;
  } catch (error) {
    dt.flow.push("❌ licenseModel.js | Error querying database: " + error);
    dt.err = true;
    dt.code = 500;
    return dt;
  }
};
  
