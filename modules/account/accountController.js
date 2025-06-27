const m = require('./accountModel');
const fn = require('../../common/fn')

exports.login = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:500,req_body:req.body,res:res,req:req};
    dt=await m.login(dt);
    res.status(dt.code).json(fn.setResponse(dt));
};

exports.register = async (req, res) => {
  const { display_name, user_email, password, phone } = req.body;
  if (!display_name || !user_email || !password || !phone) {
    return res
      .status(400)
      .json({ status: "failed", message: "All fields are required" });
  }
  let dt = { err: false, msg: '', flow: [], code: 200, req_body: req.body };
    dt = await m.registerUser(dt);
    return res.status(dt.code).json(fn.setResponse(dt));
};