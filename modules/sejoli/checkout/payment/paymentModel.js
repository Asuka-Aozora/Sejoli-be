const fn = require("../../../../common/fn");

exports.getActiveMethods = async (dt) => {
  dt.flow.push("➡️ paymentModel | start getActiveMethods");
  let rows = [];
  try {
    [rows] = await fn.db.query(
      `SELECT code, name, icon_path AS icon, description
         FROM wp_payment_methods
         WHERE is_active = 1
         ORDER BY sort_order`
    );
  } catch (err) {
    dt.flow.push("❌ paymentModel | DB Error: " + err);
    dt.err = true;
    return dt;
  }

  dt.data = rows;
  dt.err = false;
  dt.flow.push(`✅ paymentModel | fetched ${rows.length} methods`);
  return dt;
};

