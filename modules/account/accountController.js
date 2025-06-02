const m = require('./accountModel');
const fn = require('../../common/fn')

exports.login = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:500,req_body:req.body,res:res,req:req};
    dt=await m.login(dt);
    res.status(dt.code).json(fn.setResponse(dt));
};