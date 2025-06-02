const db = require('../../common/fn');



exports.cekNextPaymentDate = async (dt) => {
    if (dt.err) {dt.flow.push('❌ notifModel.js | bypass cekNextPaymentDate');return dt;}
    dt.flow.push('➡️. notifModel.js | start cekNextPaymentDate');
    
    let next_payment = {};
    let order_id_arr = [];
    const [rows] = await db.query(
        "SELECT order_id,meta_key,meta_value FROM lgsg_wc_orders_meta WHERE meta_key like '%next_payment%' and meta_value!='0' and meta_value!='' order by meta_key"
    );
    
    dt.flow.push('✅ notifModel.js | next_payment db found '+rows.length);

    if (rows && rows.length == 0) {
        dt.flow.push('❌ notifModel.js | Tidak ada data ditemukan di DB.');
        dt.err=true;
        return dt;
    }

    const today = new Date(Date.now() +7 * 60 * 60 * 1000);
    const hari_ini = today.toISOString().substring(0, 10);
    dt.hari_ini=hari_ini;
    // Fungsi bantu untuk mengurangi hari
    function getHmin(baseDate, minusDays) {
      const result = new Date(baseDate);
      result.setDate(result.getDate() - minusDays);
      return result.toISOString().substring(0, 10);
    }

    let hari_min_ke=[0,1,3,7];
    let hari_hmin=[];
    let ke_meta='';
    hari_min_ke.forEach(ke => {
        hari_hmin[ke]='';
    });
    let tgl_sendwa;

    
    rows.forEach((row, index) => {
        // console.log(`[${index + 1}] ${row.order_id} ${row.meta_key} meta_value: ${row.meta_value}`);
        if (row.meta_key=='_schedule_next_payment') {
            
            tgl_next_payment=row.meta_value.substring(0, 10);
            hari_hmin[0]=tgl_next_payment;
            hari_hmin[1] = getHmin(new Date(tgl_next_payment), 1);
            hari_hmin[3] = getHmin(new Date(tgl_next_payment), 3);
            hari_hmin[7] = getHmin(new Date(tgl_next_payment), 7);
            dt.flow.push(`ℹ️ notifModel.js | h-7 `+hari_hmin[7]);

            // H expired
            for (const ke of hari_min_ke) {
                if (hari_hmin[ke] === hari_ini && ke != 0) {
                    // Inisialisasi jika belum ada
                    if (!next_payment[ke]) {
                        next_payment[ke] = {};
                    }
                    if (!next_payment[ke][row.order_id]) {
                        next_payment[ke][row.order_id] = {};
                    }
                    next_payment[ke][row.order_id] = tgl_next_payment;
                }
            }

        }
        if (row.meta_key.includes('_sendwa_next_payment')) {
            ke_meta=row.meta_key.replace('_sendwa_next_payment','');
            ke_meta=ke_meta.substring(0,1);
            hari_min_ke.forEach(ke => {
                if (ke_meta==ke && row.meta_value=='done') {
                    tgl_sendwa=row.meta_key.replace('_sendwa_next_payment'+ke+'_','');
                    if (tgl_sendwa===hari_ini) {
                        if (next_payment[ke] && next_payment[ke][row.order_id]) {
                            dt.flow.push(`✅ notifModel.js | hapus ${row.order_id} H-${ke} karena sudah di kirim`);
                            delete next_payment[ke][row.order_id];
                        }
                    }
                }
            });
        }
    });

    if (Object.keys(next_payment).length==0) {
        dt.flow.push('❌ notifModel.js | Tidak ada next_payment yg akan di kirimi WA');
        dt.err=true;
        return dt;
    }

    dt.flow.push('✅ notifModel.js | ambil 1 data saja '+JSON.stringify(next_payment));    
    let ambil1saja = false;
    Object.entries(next_payment).forEach(([ke, orders]) => {
        if (Object.keys(next_payment[ke]).length==0 || ambil1saja==true) {
            delete next_payment[ke];
        }
        Object.entries(orders).forEach(([order_id, tgl_next_payment]) => {
            if (ambil1saja==false) {
                order_id_arr.push(order_id);
                ambil1saja=true;
            }else{
                if (next_payment[ke] && next_payment[ke][order_id]) {
                    delete next_payment[ke][order_id];
                }
            }
        });
    });

    if (Object.keys(next_payment).length==0) {
        dt.flow.push('❌ notifModel.js | Tidak ada data next_payment');
        dt.err=true;
        return dt;
    }

    dt.flow.push('✅ notifModel.js | dapat 1 data terpilih '+JSON.stringify(next_payment));

    dt.err=false;
    dt.next_payment=next_payment;
    dt.order_id_in=order_id_arr.join(",");
    dt.flow.push('✅ notifModel.js | data '+JSON.stringify(next_payment)+' siap dikirimi WA');
    return dt;
    
};


exports.getTemplateNextPayment = async (dt) => {
    if (dt.err) {dt.flow.push('❌ notifModel.js | bypass getTemplateNextPayment');return dt;}
    dt.flow.push('➡️. notifModel.js | start getTemplateNextPayment');
    
    try {
        const [rows] = await db.query(
            "SELECT option_value FROM lgsg_options WHERE option_name = ?", 
            ['woowa_pesan_subscription_reminder']
        );
        let template='';
        let next_payment_sendwa=''; //belum dikirim
        if (rows && rows.length > 0) {
            // console.log(`✅ notifModel.js | Ditemukan ${rows.length} data.`);
            rows.forEach((row, index) => {
                template=row.option_value;
            });
        } else {
            dt.flow.push('❌ notifModel.js | Tidak ada data ditemukan di DB.');
            dt.err=true;
        }
        dt.template=template;
        dt.flow.push('✅ notifModel.js | template pending_payment found');
        dt.err=false;

    } catch (error) {
        dt.flow.push('❌ notifModel.js | Error querying database. '+error);
        dt.err=true; 
    }
    
    return dt
};


exports.prepareParamSendWa = async (dt) => {
    if (dt.err) {dt.flow.push('❌ notifModel.js | bypass prepareParamSendWa');return dt;}
    
    dt.flow.push('➡️. notifModel.js | start prepareParamSendWa');
    dt.phone_no={};
    dt.message={};
    dt.key='';

    // cari billing phone
    let sql=`SELECT order_id,meta_value FROM lgsg_wc_orders_meta 
        WHERE order_id IN (`+dt.order_id_in+`) AND meta_key='_billing_address_index'` 
    dt.flow.push('✅ notifModel.js | cari billing phone | do query : '+sql);

    let [rows] = await db.query(sql);
    
    if (rows && rows.length == 0) {
        dt.flow.push('❌ notifModel.js | Tidak ada data ditemukan di DB.')
        dt.err=true; 
        return dt;
    }
    let billing_phone={};
    
    rows.forEach((row, index) => {
        billing_phone_arr=row.meta_value.split('@');
        if (!billing_phone[row.order_id]) {
            billing_phone[row.order_id] = {};
        }
        billing_phone[row.order_id]=billing_phone_arr[1].replace(/[^0-9]/g, '');
    });
    
    if (Object.keys(billing_phone).length==0) {
        dt.flow.push('❌ notifModel.js | billing phone empty.')
        dt.err=true; 
        return dt;
    }
    dt.phone_no=billing_phone;
    dt.flow.push('✅ notifModel.js | prepareParamSendWa | billing phone found '+billing_phone);
    


    // cari display name    
    sql=`SELECT o.id as order_id,m.display_name from lgsg_wc_orders o 
        left join  lgsg_users m on o.customer_id=m.id 
        where  o.id IN (`+dt.order_id_in+`)`;

    dt.flow.push('✅ notifModel.js | cari display name | do query : '+sql);
    [rows] = await db.query(sql);
    
    if (rows && rows.length == 0) {
        dt.flow.push('❌ notifModel.js | Tidak ada data ditemukan di DB.')
        dt.err=true; 
        return dt;
    }

    let display_name={};
    rows.forEach((row, index) => {
        display_name[row.order_id]=row.display_name; 
    });

    if (Object.keys(display_name).length==0) {
        dt.flow.push('❌ notifModel.js | display_name empty.')
        dt.err=true; 
        return dt;
    }
    dt.display_name=display_name;
    dt.flow.push('✅ notifModel.js | prepareParamSendWa | display_name found '+display_name);

    // cari no_sim    
    sql=`SELECT i.order_id,m.meta_value as no_sim from lgsg_woocommerce_order_itemmeta m 
    JOIN lgsg_woocommerce_order_items i ON m.order_item_id=i.order_item_id 
    WHERE i.order_id IN (`+dt.order_id_in+`) and m.meta_key='SIM'`;

    dt.flow.push('✅ notifModel.js | cari no_sim | do query : '+sql);
    [rows] = await db.query(sql);
    
    if (rows && rows.length == 0) {
        dt.flow.push('❌ notifModel.js | Tidak ada data ditemukan di DB.')
        dt.err=true; 
        return dt;
    }

    let no_sim={};
    rows.forEach((row, index) => {
        no_sim[row.order_id]=row.no_sim; 
    });

    if (Object.keys(no_sim).length==0) {
        dt.flow.push('❌ notifModel.js | no_sim empty.')
        dt.err=true; 
        return dt;
    }
    dt.no_sim=no_sim;
    dt.flow.push('✅ notifModel.js | prepareParamSendWa | no_sim found '+no_sim);
    

    return dt;
}

exports.parsingShortcode = async (dt) => {
    if (dt.err) {dt.flow.push('❌ notifModel.js | bypass parsingShortcode');return dt;}
    dt.flow.push('➡️ notifModel.js | start parsingShortcode'); 
    
    if (Object.keys(dt.next_payment).length==0) {
        dt.flow.push('❌ notifModel.js | dt.next_payment empty.')
        dt.err=true; 
        return dt;
    }

    let pesan={};
    let pesan_str='';

    for (const [ke, orders] of Object.entries(dt.next_payment)) {
        for (const [order_id, tgl_next_payment] of Object.entries(orders)) {
            dt.flow.push(`✅ notifModel.js | parsingShortcode | h-${ke} order_id ${order_id} next_payment ${tgl_next_payment}`);
            
            let pesan_str   = dt.template.replace('{display_name}', dt.display_name[order_id]); 
            pesan_str       = pesan_str.replace('{NO_SIM}', dt.no_sim[order_id]); 

            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const tgl_next_payment_indo = new Date(tgl_next_payment).toLocaleDateString('id-ID', options);


            pesan[order_id] = pesan_str.replace('{tanggal_expired}', tgl_next_payment_indo); 
        }
    }


    dt.message=pesan;
    return dt
};
exports.sendWaNextPayment = async (dt) => {
    if (dt.err) {
        dt.flow.push('❌ notifModel.js | bypass sendWaNextPayment');
        return dt;
    }

    dt.flow.push('➡️ notifModel.js | start sendWaNextPayment');
    let axios = require('axios');
    require('dotenv').config();
    let key = process.env.WOOWA_KEY;
    let status_sendwa={};
    const promises = Object.entries(dt.message).map(async ([order_id, pesan]) => {
        let phone_no = dt.phone_no[order_id];

        let data = {
            phone_no: phone_no,
            // phone_no: '6287820007878',
            key: key,
            message: pesan
        };

        dt.flow.push(`✅ notifModel.js | sendWaNextPayment param ${JSON.stringify(data)}`);

        try {
            const response = await axios.post('https://notifapi.com/async_send_message', data);
            dt.flow.push('✅ notifModel.js | WA Sent : '+ response.data);
            status_sendwa[order_id]='success';
        } catch (error) {
            dt.flow.push('❌ notifModel.js | WA Sent error : '+ error.message || error);
            status_sendwa[order_id]='failed';
        }
    });
    dt.status_sendwa=status_sendwa;

    await Promise.all(promises); // Tunggu semua request selesai
    return dt;
};


exports.setFlagSendWaNextPayment = async (dt) => {
    if (dt.err) {dt.flow.push('❌ notifModel.js | bypass setFlagSendWaNextPayment');return dt;}
    dt.flow.push('➡️ notifModel.js | start setFlagSendWaNextPayment');
    let sql='';
    Object.entries(dt.next_payment).forEach(([ke, orders]) => {
        Object.entries(orders).forEach(([order_id, tgl_next_payment]) => {
            if (dt.status_sendwa[order_id]=='success') {
                sql=`DELETE FROM lgsg_wc_orders_meta WHERE meta_key='_sendwa_next_payment${ke}_${dt.hari_ini}' and order_id='${order_id}'`;
                db.query(sql);
                sql=`INSERT INTO lgsg_wc_orders_meta(order_id,meta_key,meta_value) VALUES ('${order_id}','_sendwa_next_payment${ke}_${dt.hari_ini}','done')`;
                db.query(sql);
                dt.flow.push('✅ notifModel.js | setFlagSendWaNextPayment '+sql);
            }else{
                dt.flow.push('❌ notifModel.js | setFlagSendWaNextPayment not update DB');
            }
        });
    });

    return dt;
};




