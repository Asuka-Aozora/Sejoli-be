// granular email validator
function validateEmailField(email) {
  if (!email || email.trim() === "") {
    return {
      errorType: "EMPTY_EMAIL",
      message: "Email wajib diisi.",
    };
  }
  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return {
      errorType: "MISSING_AT_OR_LOCALPART",
      message: "Email harus mengandung '@' dengan teks sebelum dan sesudahnya.",
    };
  }
  if (/[\s\/\\(),:;<>[\]]/.test(email)) {
    return {
      errorType: "ILLEGAL_CHARACTERS",
      message:
        "Email mengandung karakter tidak valid (spasi atau simbol terlarang).",
    };
  }
  const domain = email.slice(atIndex + 1);
  if (!domain.includes(".")) {
    return {
      errorType: "MISSING_DOT_IN_DOMAIN",
      message: "Domain email harus mengandung setidaknya satu titik ('.').",
    };
  }
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (tld.length < 2) {
    return {
      errorType: "INVALID_TLD",
      message: "TLD (setelah titik terakhir) harus minimal 2 karakter.",
    };
  }
  return null; // valid
}

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

  const errors = [];

  // 1) Required‑field checks
  if (!product_id)
    errors.push({
      field: "product_id",
      errorType: "EMPTY_PRODUCT_ID",
      message: "Product ID wajib diisi.",
    });
  if (!quantity)
    errors.push({
      field: "quantity",
      errorType: "EMPTY_QUANTITY",
      message: "Quantity wajib diisi.",
    });
  if (!user_id)
    errors.push({
      field: "user_id",
      errorType: "EMPTY_USER_ID",
      message: "User ID wajib diisi.",
    });
  if (!user_email)
    errors.push({
      field: "user_email",
      errorType: "EMPTY_EMAIL",
      message: "Email wajib diisi.",
    });
  if (!phone)
    errors.push({
      field: "phone",
      errorType: "EMPTY_PHONE",
      message: "Phone wajib diisi.",
    });
  if (!grand_total)
    errors.push({
      field: "grand_total",
      errorType: "EMPTY_GRAND_TOTAL",
      message: "Grand total wajib diisi.",
    });
  if (!bank)
    errors.push({
      field: "bank",
      errorType: "EMPTY_BANK",
      message: "Bank wajib dipilih.",
    });

  // 2) Email format (hanya jika user_email terisi)
  if (user_email) {
    const emailError = validateEmailField(user_email);
    if (emailError) {
      errors.push({
        field: "user_email",
        errorType: emailError.errorType,
        message: emailError.message,
      });
    }
  }
  // 3) Jika ada error, kirim response
  if (errors.length) {
    return res.status(400).json({
      error: true,
      errors, // array of { field, errorType, message }
    });
  }

  // 4) Lolos semua validasi
  next();
};
