const fn = require("../../../../common/fn");
const unserialize = require("php-serialize").unserialize;

exports.getCP = async (dt) => {
  if (dt.err) {
    dt.flow.push("❌ salesModel.js | bypass getCP");
    return dt;
  }
  dt.flow.push("➡️. salesModel.js | start getCP");

  let rows = [];

  try {
    [rows] = await fn.db.query(`
           SELECT c.*
           FROM wp_sejolisa_coupons c
       `);
  } catch (error) {
    dt.flow.push("❌ salesModel.js | Error querying database. " + error);
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  let arr = [];
  if (rows && rows.length > 0) {
    // console.log(`✅ salesModel.js | Ditemukan ${rows.length} data.`);
    rows.forEach((row) => {
      try {
        const parsedDiscount = unserialize(row.discount);
        row.discount = parsedDiscount;
      } catch (e) {
        row.discount = null;
      }
      arr.push(row);
    });
  } else {
    dt.flow.push("❌ salesModel.js | Tidak ada data ditemukan di DB.");
    dt.err = true;
    dt.code = 404;
    return dt;
  }

  dt.data = arr;
  dt.flow.push("✅ salesModel.js | data orders found");
  dt.err = false;

  return dt;
};
