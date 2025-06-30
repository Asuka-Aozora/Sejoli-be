const m = require("./checkoutModel");
const fn = require("../../../common/fn");

exports.checkUser = async (req, res) => {
  const { email } = req.body;
  // Validasi simple
  if (!email) {
    return res
      .status(400)
      .json({ status: "failed", code: 400, message: "Email is required" });
  }

  let dt = {
    err: false,
    msg: "",
    flow: ["➡️ checkUser | start"],
    code: 200,
    data: null,
  };

  try {
    const exists = await m.checkUser(email);
    dt.data = exists;
    dt.flow.push(
      exists.exists
        ? `✅ checkUser | user exists ID=${exists.user_id}`
        : "✅ checkUser | user not exists"
    );
    dt.msg = dt.flow[dt.flow.length - 1].split("|")[1].trim();
    return res.status(200).json(fn.setResponse(dt));
  } catch (e) {
    dt.err = true;
    dt.code = 500;
    dt.msg = e.message;
    dt.flow.push(`❌ checkUser | error: ${e.message}`);
    return res.status(500).json(fn.setResponse(dt));
  }
};

exports.getCK = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200 };
  dt = await m.getCK(dt);
  console.log("dt ", dt);
  res.status(dt.code).json(fn.setResponse(dt));
};

exports.postCheckout = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:200,req_body:req.body,}
    dt = await m.postCheckout(dt);
    res.status(dt.code).json({
      code: dt.code,
      err: dt.err,
      msg: dt.msg,
      flow: dt.flow,
      data: dt.req_body,
    });;
};
