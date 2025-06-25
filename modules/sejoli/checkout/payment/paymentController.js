const fn = require("../../../../common/fn");
const m = require("./paymentModel");

exports.getActiveMethods = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200 };
  dt = await m.getActiveMethods(dt);
  console.log("dt ", dt);
  res.status(dt.code).json(fn.setResponse(dt));
};