const m = require('./sampleModel');
const fn = require('../../common/fn');

exports.getData = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:500}
    dt=await m.getData(dt);
    console.log('dt ',dt);
    res.status(dt.code).json(fn.setResponse(dt));
};

exports.addData = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:500,req_body:req.body,res:res}
    dt=await m.addData(dt);
    res.status(dt.code).json(fn.setResponse(dt));
};

exports.updateData = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:500,req_body:req.body,res:res}
    dt=await m.updateData(dt);
    res.status(dt.code).json(fn.setResponse(dt));
};

exports.delData = async (req,res) => {
    let dt = {err:false,msg:'',flow:[],code:500,req_body:req.body,res:res}
    dt=await m.delData(dt);
    res.status(dt.code).json(fn.setResponse(dt));
};
    

    