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
