const fn = require('../../../common/fn');

exports.getOrder = async (dt) => {
     if (dt.err) {dt.flow.push('❌ salesModel.js | bypass getOrder');return dt;}
        dt.flow.push('➡️. salesModel.js | start getOrder');

        let rows=[];
        
        try {
            [rows] = await fn.db.query(`
            SELECT o.*, u.display_name, u.user_email, p.post_title AS product_name
            FROM wp_sejolisa_orders o
            JOIN wp_users u ON o.user_id = u.ID
            JOIN wp_posts p ON o.product_id = p.ID
        `);
        } catch (error) {
            dt.flow.push('❌ salesModel.js | Error querying database. '+error);
            dt.err = true;
            dt.code = 500;
            return dt;
        }

        let arr=[];
        if (rows && rows.length > 0) {
            // console.log(`✅ salesModel.js | Ditemukan ${rows.length} data.`);
            rows.forEach((row, index) => {
                arr.push(row);
            });
        } else {
            dt.flow.push('❌ salesModel.js | Tidak ada data ditemukan di DB.');
            dt.err = true;
            dt.code = 404;
            return dt;
        }

        dt.data=arr;
        dt.flow.push('✅ salesModel.js | data orders found');
        dt.err=false;

        return dt;
}

exports.postCheckout = async (dt) => {
  const { product_id, quantity, username, email, phone, payment_gateway, status } = dt.req_body;

  if (!status || !product_id || !quantity || !username || !email || !phone || !payment_gateway) {
    dt.err = true;
    dt.code = 400;
    dt.flow.push("❌ checkoutModel.js | status, product_id, quantity, username, email, phone, payment_gateway are required");
    return dt;
  }

  try {

    const values = [product_id, quantity, username, email, phone, payment_gateway, status];
    await fn.db.query(
      `INSERT INTO wp_sejolisa_orders (product_id, quantity, username, email, phone, payment_gateway, status) VALUES (?,?,?,?,?,?,?)`,
      values
    );
  } catch (error) {
    dt.flow.push(
      "❌ checkoutModel.js | Error querying database. " + error.toString()
    );
    dt.err = true;
    dt.code = 500;
    return dt;
  }

  dt.data = {
    product_id,
    quantity,
    username,
    email,
    phone,
    payment_gateway,
    status
  };
  dt.flow.push(`✅ checkoutModel.js | ${ID.length} order(s) updated`);
  dt.err = false;

  return dt;
};
