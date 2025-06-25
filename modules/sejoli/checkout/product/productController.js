const fn = require("../../../../common/fn");
const m = require("./productModel");

exports.getProduct = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200 };
  dt = await m.getProduct(dt);
  console.log("dt ", dt);
  res.status(dt.code).json(fn.setResponse(dt));
};