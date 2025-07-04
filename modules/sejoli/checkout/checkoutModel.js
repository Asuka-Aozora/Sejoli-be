const fn = require("../../../common/fn");

exports.checkUser = async (email) => {
  const [rows] = await fn.db.query(
    `SELECT ID, user_login FROM wp_users WHERE user_email = ? LIMIT 1`,
    [email.trim().toLowerCase()]
  );
  if (rows.length) {
    return { exists: true, user_id: rows[0].ID, username: rows[0].user_login };
  } else {
    return { exists: false };
  }
};

exports.getCK = async (dt) => {
  if (dt.err) {
    dt.flow.push("❌ salesModel.js | bypass getCK");
    return dt;
  }
  dt.flow.push("➡️. salesModel.js | start getCK");

  let rows = [];

  try {
    [rows] = await fn.db.query(`
            SELECT o.*, u.display_name, u.user_email, p.post_title AS product_name, c.*
            FROM wp_sejolisa_orders o
            JOIN wp_users u ON o.user_id = u.ID
            JOIN wp_posts p ON o.product_id = p.ID
            JOIN wp_sejolisa_coupons c
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
    rows.forEach((row, index) => {
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

exports.postCheckout = async (dt) => {
  const b = dt.req_body;
  const conn = await fn.db.getConnection();
  await conn.beginTransaction();
  try {
    // 1. Cek atau Buat User
    let userId;
    // 1.a. Kalau ada b.user_id (angka), langsung gunakan
    if (b.user_id) {
      userId = b.user_id;
      dt.flow.push("✅ Using existing user ID=" + userId);
    } else {
      // 1.b. Cek berdasarkan email
      const [u] = await conn.query(
        `SELECT ID FROM wp_users WHERE user_email = ? LIMIT 1`,
        [b.user_email]
      );
      if (u.length) {
        userId = u[0].ID;
        dt.flow.push("✅ User found by email ID=" + userId);
      } else {
        // 1.c. Buat user baru pakai b.display_name
        dt.flow.push("➡️ Creating new user");
        const loginName = b.display_name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");
        const pwHash = fn.hashPassword(b.password);

        const [r] = await conn.query(
          `INSERT INTO wp_users
         (user_login, user_pass, user_email, user_registered, display_name)
       VALUES (?, ?, ?, NOW(), ?)`,
          [loginName, pwHash, b.user_email, b.display_name]
        );
        userId = r.insertId;
        dt.flow.push(`✅ New user created ID=${userId}`);

        // simpan nomor telepon
        await conn.query(
          `INSERT INTO wp_usermeta (user_id, meta_key, meta_value)
        VALUES (?, '_phone', ?)`,
          [userId, b.phone]
        );
        dt.flow.push("✅ Saved user phone in wp_usermeta");
      }
    }

    // 2. Insert Order
    const [orderR] = await conn.query(
      `INSERT INTO wp_sejolisa_orders
          (ID, order_parent_id, product_id, user_id,
           affiliate_id, coupon_id, 
           payment_gateway, grand_total, quantity, 
           type, status, meta_data, created_at, updated_at)
         VALUES
          (?,0, ?, ?, ?, ?, ?, ?, ?, 'subscription-regular', 'pending', ?, NOW(), NOW())`,
      [
        b.ID || 0, 
        b.product_id,
        userId,
        b.affiliate_id || 0,
        b.coupon_id || 0,
        b.bank,
        b.grand_total,
        b.quantity,
        JSON.stringify(b.meta_data || {}),
      ]
    );
    const orderId = orderR.insertId;
    dt.flow.push(`✅ Order created ID=${orderId}`);

    // 3. Insert Transaksi
    const safeBank = b.bank.replace(/[^a-zA-Z0-9]/g, "_");
    const txTable = `wp_sejolisa_${safeBank}_transaction`;

    // Persiapkan semua kolom NOT NULL
    const account = b.account || "";
    const uniqueCode = await fn.generateUniqueCode(conn, txTable);
    const metaData = b.meta_data || {};

    await conn.query(
      `INSERT INTO ${txTable}
        (order_id, user_id, account, total, unique_code, meta_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        orderId,
        b.user_id,
        account,
        b.grand_total,
        uniqueCode,
        JSON.stringify(metaData),
      ]
    );
    dt.flow.push(`✅ Transaction inserted into ${txTable}`);

    // 4. Commit
    await conn.commit();
    dt.data = { orderId, userId };
    dt.msg = "Checkout successful";
    dt.flow.push("✅ Transaction committed");
    return dt;
  } catch (err) {
    await conn.rollback();
    dt.err = true;
    dt.code = 500;
    dt.msg = err.message;
    dt.flow.push("❌ Rolled back due to error: " + err.message);
    return dt;
  } finally {
    conn.release();
  }
};
exports.updateQuantity = async (dt) => {
  let rows;
  let currentStock;
  const tx = fn.db; // asumsi ini mysql2 promise

  try {
    const { post_id, quantity } = dt.req_body;

    // Validasi input
    if (!post_id || typeof quantity !== "number" || quantity < 1) {
      dt.flow.push(
        "❌ sampleModel.js | post_id and quantity required and quantity must be > 0"
      );
      dt.err = true;
      return dt;
    }

    // 1) Ambil stock sekarang
    const [fetchRows] = await tx.query(
      `SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = '_limit_buy_time  '`,
      [post_id]
    );

    if (fetchRows.length === 0) {
      dt.flow.push(
        `❌ sampleModel.js | stock meta not found for post_id ${post_id}`
      );
      dt.err = true;
      return dt;
    }

    currentStock = parseInt(fetchRows[0].meta_value, 10);
    dt.flow.push(
      `ℹ️ sampleModel.js | currentStock for post_id ${post_id} = ${currentStock}`
    );

    // 2) Hitung sisa stock
    const newStock = Math.max(currentStock - quantity, 0);
    dt.flow.push(
      `ℹ️ sampleModel.js | reducing stock by ${quantity}, newStock = ${newStock}`
    );

    // 3) Update ke database
    const [updateResult] = await tx.query(
      `UPDATE wp_postmeta 
         SET meta_value = ?
       WHERE post_id = ? 
         AND meta_key = '_limit_buy_time'`,
      [newStock, post_id]
    );

    rows = updateResult;
    dt.flow.push(
      `✅ sampleModel.js | stock updated, affectedRows = ${updateResult.affectedRows}`
    );

    // 4) Simpan hasil ke dt.data
    dt.data = {
      post_id,
      previousStock: currentStock,
      quantityReduced: quantity,
      remainingStock: newStock,
      rows,
    };
    dt.err = false;
    return dt;
  } catch (error) {
    dt.flow.push("❌ sampleModel.js | Error updating stock: " + error.message);
    dt.err = true;
    return dt;
  }
};
