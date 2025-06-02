const m = require('./notifModel');

exports.sendNotifNextPayment = async () => {
    let dt = {err:false,msg:'',flow:[]}
    dt=await m.cekNextPaymentDate(dt);
    dt=await m.getTemplateNextPayment(dt);
    dt=await m.prepareParamSendWa(dt); 
    dt=await m.parsingShortcode(dt); 
    dt=await m.sendWaNextPayment(dt);
    dt=await m.setFlagSendWaNextPayment(dt);
        console.log('dt ',dt);
    
};