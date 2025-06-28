const fn = require("../../../../common/fn");

exports.getProduct = async (dt) => {
  if (dt.err) return dt; // jika sudah error, berhenti
  dt.flow.push("➡️ productModel | mulai query produk");

  try {
    const sql = `
      SELECT 
        p.ID AS id,
        p.post_title AS name,
        pm_price.meta_value AS price,
        pm_price._limit_buy_times AS limit_product
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm_price 
        ON pm_price.post_id = p.ID AND pm_price.meta_key = '_price'
      WHERE p.post_type = 'sejoli-product';
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
