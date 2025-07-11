// couponController.js
const fn = require("../../../common/fn");
const m = require("./couponModel");

exports.getCoupons = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200, req_query: req.query };
  dt.flow.push("➡️ couponController | start getCoupons");

  dt = await m.getCoupons(dt);

  console.log("flow:", dt.flow);
  res.status(dt.code).json(fn.setResponse(dt));
};
