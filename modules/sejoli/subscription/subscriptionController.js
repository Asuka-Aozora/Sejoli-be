const m = require("./subscriptionModel");
const fn = require("../../../common/fn");

exports.getSubs = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200 };
  dt = await m.getSubs(dt);
  console.log("dt ", dt);
  res.status(dt.code).json(fn.setResponse(dt));
};
exports.updateSubsStatus = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:200,req_body:req.body,res:res}
    dt = await m.updateSubsStatus(dt);
    res.status(dt.code).json(fn.setResponse(dt));
};
