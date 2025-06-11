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

exports.updateOrderStatus = async (dt) => {
  let rows = [];
  let status = "";
  let orderId = "";

  try {
    status = dt.req_body.status;
    orderId = dt.req_body.ID;

    if (!status || !orderId) {
      dt.flow.push("❌ salesModel.js | status & ID are required");
      dt.err = true;
      return dt;
    }

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

    [rows] = await fn.db.query(
      `UPDATE wp_sejolisa_orders 
             SET status = ? 
             WHERE ID = ?`,
      [status, orderId]
    );
  } catch (error) {
    dt.flow.push("❌ salesModel.js | Error querying database. " + error);
    dt.err = true;
    return dt;
  }

  dt.data = {
    ID: orderId,
    status: status,
    rows_affected: rows.affectedRows,
  };
  dt.flow.push("✅ salesModel.js | order status updated");
  dt.err = false;

  return dt;
};
