const m = require("./checkoutModel");
const fn = require("../../../common/fn");

exports.getCK = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200 };
  dt = await m.getCK(dt);
  console.log("dt ", dt);
  res.status(dt.code).json(fn.setResponse(dt));
};

exports.postCheckout = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:200,req_body:req.body,res:res}
    dt = await m.postCheckout(dt);
    res.status(dt.code).json(fn.setResponse(dt));
};
