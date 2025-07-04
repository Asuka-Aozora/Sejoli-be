const fn = require("../../../../common/fn");

exports.getProduct = async (dt) => {
  if (dt.err) return dt; // jika sudah error, berhenti
  dt.flow.push("➡️ productModel | mulai query produk");

  try {
    const sql = `
    SELECT
      p.ID         AS id,
      p.post_title AS name,
      MAX(CASE WHEN pm.meta_key = '_price'           THEN pm.meta_value END) AS price,
      MAX(CASE WHEN pm.meta_key = '_limit_buy_time'  THEN pm.meta_value END) AS limit_buy_time
    FROM wp_posts p
    LEFT JOIN wp_postmeta pm
      ON pm.post_id = p.ID
      AND pm.meta_key IN ('_price', '_limit_buy_time')
    WHERE p.post_type = 'sejoli-product'
    GROUP BY p.ID, p.post_title;
    `;
    const [rows] = await fn.db.query(sql);
    if (!rows.length) {
      dt.err = true;
      dt.code = 404;
      dt.flow.push("❌ productModel | tidak ada produk ditemukan");
      return dt;
    }
    dt.data = rows; // isi data untuk dikirim
    dt.flow.push(`✅ productModel | ketemu ${rows.length} produk`);
  } catch (error) {
    dt.err = true;
    dt.code = 500;
    dt.flow.push("❌ productModel | error query: " + error.message);
  }
  return dt;
};

exports.getProductQuantity = async (dt, productId) => {
  if (dt.err) return dt;
  dt.flow.push("➡️ productModel | mulai query limit_buy_time");

  try {
    const sql = `
      SELECT meta_value AS max_quantity
      FROM wp_postmeta
      WHERE post_id = ?
        AND meta_key = '_limit_buy_time'
      LIMIT 1
    `;
    const [rows] = await fn.db.query(sql, [productId]);
    if (!rows.length) {
      dt.err = true;
      dt.code = 404;
      dt.flow.push(
        `❌ productModel | tidak ditemukan limit_buy_time untuk productId=${productId}`
      );
      return dt;
    }
    const value = parseInt(rows[0].max_quantity, 10);
    dt.data = { max_quantity: isNaN(value) ? 3 : value };
    dt.flow.push(`✅ productModel | limit_buy_time=${dt.data.max_quantity}`);
  } catch (error) {
    dt.err = true;
    dt.code = 500;
    dt.flow.push("❌ productModel | error query: " + error.message);
  }
  return dt;
};

exports.getProductBySlug = async (dt) => {
  try {
    const [rows] = await fn.db.query(
      `
      SELECT
        p.ID as id,
        p.post_title as name,
        pm.meta_value as price
      FROM wp_posts p
      JOIN wp_postmeta pm ON pm.post_id = p.ID AND pm.meta_key = '_price'
      WHERE p.post_name = ?
      `,
      [dt.slug]
    );

    if (!rows.length) {
      dt.err = true;
      dt.code = 404;
      dt.msg = "Produk tidak ditemukan untuk slug: " + dt.slug;
      return dt;
    }

    dt.data = rows;
    return dt;
  } catch (err) {
    dt.err = true;
    dt.code = 500;
    dt.msg = "DB Error: " + err.message;
    return dt;
  }
};
