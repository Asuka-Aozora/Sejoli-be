exports.checkoutBody = (req, res, next) => {
  const {
    product_id,
    quantity,
    user_id,
    user_email,
    phone,
    grand_total,
    bank,
  } = req.body;
  const missing = [];
  if (!product_id) missing.push("product_id");
  if (!quantity) missing.push("quantity");
  if (!user_id) missing.push("user_id");
  if (!user_email) missing.push("user_email");
  if (!phone) missing.push("phone");
  if (!grand_total) missing.push("grand_total");
  if (!bank) missing.push("bank");
  if (missing.length) {
    return res.status(400).json({
      error: true,
      message: "Missing fields: " + missing.join(", "),
    });
  }
  next();
};
