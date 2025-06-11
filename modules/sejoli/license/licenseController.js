const m = require("./licenseModel");
const fn = require("../../../common/fn");

exports.getOrder = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200 };
  dt = await m.getOrder(dt);
  console.log("dt ", dt);
  res.status(dt.code).json(fn.setResponse(dt));
};
