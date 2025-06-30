const fn = require("../../common/fn");
const WordPressHash = require("wordpress-hash-node");

exports.login = async (dt) => {
  let email = "";
  let password = "";
  let user = {};
  //   try {
  email = dt.req_body.email;
  password = dt.req_body.password;

  if (!email || !password) {
    dt.flow.push("❌ accountModel.js | email or password required");
    dt.code = 400;
    dt.err = true;
    return dt;
  }

  // Query database - hanya ambil field yang diperlukan
  const query = `
            SELECT ID, user_login, user_pass, user_email, display_name
            FROM wp_users 
            WHERE user_email = '${email}'
            LIMIT 1
        `;

  const [rows] = await fn.db.query(query, [email]);
  user = rows[0];
  //   } catch (error) {
  //     dt.flow.push("❌ accountModel.js | Error querying database: " + error);
  //     dt.code = 500;
  //     dt.err = true;
  //     return dt;
  //   }

  if (!user) {
    dt.flow.push("❌ accountModel.js | User not found ");
    dt.code = 404;
    dt.err = true;
    return dt;
  }

  // Verifikasi password menggunakan WordPress hash
  const isMatch = WordPressHash.CheckPassword(password, user.user_pass);
  if (!isMatch) {
    dt.flow.push("❌ accountModel.js | Invalid password");
    dt.code = 401;
    dt.err = true;
    return dt;
  }
  // Generate token
  const token = fn.generateToken(dt.req, user.ID);
  if (!token) {
    dt.flow.push("❌ accountModel.js | Failed generate token");
    dt.code = 500;
    dt.err = true;
    return dt;
  }

  dt.data = {
    token: token,
    user: user,
  };
  dt.flow.push("✅ accountModel.js | login success");
  dt.code = 200;
  dt.err = false;

  // Return data yang diperlukan saja
  return dt;
};


exports.registerUser = async (dt) => {
  const b = dt.req_body;
  const conn = await fn.db.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Cek email sudah ada?
    const [exists] = await conn.query(
      "SELECT ID FROM wp_users WHERE user_email = ? LIMIT 1",
      [b.user_email.trim().toLowerCase()]
    );
    if (exists.length) {
      dt.err = true;
      dt.code = 409;
      dt.msg = "Email already registered";
      dt.flow.push("❌ registerUser | email exists");
      await conn.rollback();
      return dt;
    }
    dt.flow.push("➡️ registerUser | email free");

    // 2. Buat login name dari display_name
    const loginName = b.display_name.trim().toLowerCase().replace(/\s+/g, "_");

    // 3. Hash password
    const pwHash = fn.hashPassword(b.password);

    // 4. Insert ke wp_users
    const [r] = await conn.query(
      `INSERT INTO wp_users
         (user_login, user_pass, user_email, user_registered, display_name)
       VALUES (?, ?, ?, NOW(), ?)`,
      [loginName, pwHash, b.user_email, b.display_name]
    );
    const userId = r.insertId;
    dt.flow.push(`✅ registerUser | new user ID=${userId}`);

    // 5. Simpan phone di usermeta
    await conn.query(
      `INSERT INTO wp_usermeta (user_id, meta_key, meta_value)
         VALUES (?, '_phone', ?)`,
      [userId, b.phone]
    );
    dt.flow.push("✅ registerUser | saved phone");

    await conn.commit();
    dt.data = { user_id: userId };
    dt.msg = "Registration successful";
    return dt;
  } catch (err) {
    await conn.rollback();
    dt.err = true;
    dt.code = 500;
    dt.msg = err.message;
    dt.flow.push("❌ registerUser | rollback: " + err.message);
    return dt;
  } finally {
    conn.release();
  }
};