const fn = require('../../common/fn');

exports.getData = async (dt) => {
     if (dt.err) {dt.flow.push('❌ sampleModel.js | bypass getDataSample');return dt;}
        dt.flow.push('➡️. sampleModel.js | start getDataSample');

        let rows=[];
        
        try {
            [rows] = await fn.db.query(
                "SELECT * FROM wp_users"
            );
        } catch (error) {
            dt.flow.push('❌ sampleModel.js | Error querying database. '+error);
            dt.err=true; 
            return dt;
        }

        let arr=[];
        if (rows && rows.length > 0) {
            // console.log(`✅ sampleModel.js | Ditemukan ${rows.length} data.`);
            rows.forEach((row, index) => {
                arr.push(row);
            });
        } else {
            dt.flow.push('❌ sampleModel.js | Tidak ada data ditemukan di DB.');
            dt.err=true;
            return dt;
        }

        dt.data=arr;
        dt.flow.push('✅ sampleModel.js | data user found');
        dt.err=false;

        return dt;
}

exports.addData = async (dt) => {
    let rows = [];
    let value = '';

    try {
        value = dt.req_body.no_hp;

        if (!value) {
            dt.flow.push('❌ sampleModel.js | no_hp required');
            dt.err = true; 
            return dt;
        }
        
        const dataUser = await this.getData(dt);
        const userId = dataUser.data[0].ID;

        // ✅ Cek apakah data sudah ada
        const [existingData] = await fn.db.query(
            `SELECT * FROM wp_usermeta WHERE user_id = ? AND meta_key = 'no_hp'`,
            [userId]
        );

        if (existingData.length > 0) {
            dt.flow.push('❌ sampleModel.js | data already added');
            dt.err = true;
            dt.code = 409; // Conflict status code
            return dt;
        }

        // Insert data jika belum ada
        [rows] = await fn.db.query(
            `INSERT INTO wp_usermeta (user_id, meta_key, meta_value) VALUES (?, 'no_hp', ?)`,
            [userId, value]
        );

    } catch (error) {
        dt.flow.push('❌ sampleModel.js | Error querying database. ' + error);
        dt.err = true; 
        return dt;
    }

    dt.data = {
        value:value,
        rows:rows
    };
    dt.flow.push('✅ sampleModel.js | data user added');
    dt.err = false;
    dt.code = 201; // Created status code

    return dt;
}

exports.updateData = async (dt) => {

    let rows=[];
    let value='';

    try {
        value=dt.req_body.no_hp;

        if (!value) {
            dt.flow.push('❌ sampleModel.js | no_hp required');
            dt.err=true; 
            return dt;
        }
        
        const dataUser= await this.getData(dt);
        const userId=dataUser.data[0].ID;

        [rows] = await fn.db.query(
            `UPDATE wp_usermeta SET meta_value = '${value}' WHERE user_id = '${userId}' AND meta_key = 'no_hp'`
        );

    } catch (error) {
        dt.flow.push('❌ sampleModel.js | Error querying database. '+error);
        dt.err=true; 
        return dt;
    }

    dt.data={
        value:value,
        rows:rows
    };
    dt.flow.push('✅ sampleModel.js | data user updated');
    dt.err=false;

    return dt;
}

exports.delData = async (dt) => {

    let rows=[];
    let meta_key='';

    try {
        meta_key=dt.req_body.meta_key;

        if (!meta_key) {
            dt.flow.push('❌ sampleModel.js | meta_key required');
            dt.err=true; 
            return dt;
        }
        
        const dataUser= await this.getData(dt);
        const userId=dataUser.data[0].ID;

        [rows] = await fn.db.query(
            `DELETE FROM wp_usermeta WHERE user_id = ? AND meta_key = ?`,
            [userId, meta_key]
        );

    } catch (error) {
        dt.flow.push('❌ sampleModel.js | Error querying database. '+error);
        dt.err=true; 
        return dt;
    }

    dt.data={
        meta_key:meta_key,
        rows:rows
    };
    dt.flow.push('✅ sampleModel.js | data user deleted');
    dt.err=false;

    return dt;
}