const fn = require('../../../common/fn');

exports.getOrder = async (dt) => {
     if (dt.err) {dt.flow.push('❌ salesModel.js | bypass getOrder');return dt;}
        dt.flow.push('➡️. salesModel.js | start getOrder');

        let rows=[];
        
        try {
            [rows] = await fn.db.query(`
            SELECT o.*, u.display_name
            FROM wp_sejolisa_orders o
            JOIN wp_users u ON o.user_id = u.ID
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
