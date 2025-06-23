const express = require("express");
const router = express.Router();
const fn = require("../common/fn");
const sample = require("../modules/sample/sampleController");
const sales = require("../modules/sejoli/sales/salesController");
const account = require("../modules/account/accountController");
const license = require("../modules/sejoli/license/licenseController");
const subs = require("../modules/sejoli/subscription/subscriptionController");
const checkout = require("../modules/sejoli/checkout/checkoutController");

router.get("/", async (req, res) => {
  res.send("Welcome to Node Api");
}); 

router.post("/login", account.login);
router.get("/users", fn.otorisasi("admin"), sample.getData);
router.post("/addData", fn.otorisasi(), sample.addData);
router.patch("/updateData", fn.otorisasi(), sample.updateData);
router.delete("/delData", fn.otorisasi(), sample.delData);

// router orders for sales
router.get("/get-orders", fn.otorisasi(), sales.getOrder);
router.patch("/update-order-status", fn.otorisasi(), sales.updateOrderStatus);

// router licenses
router.get("/get-licenses", fn.otorisasi(), license.getLicense);

// router subscriptions
router.get("/get-subs", fn.otorisasi(), subs.getSubs);
router.patch("/update-subs", fn.otorisasi(), subs.updateSubsStatus);

// router checkout
router.get("/get-ck", fn.otorisasi(), checkout.getCK);
router.get("/get-cp", fn.otorisasi(), checkout.getCP);


module.exports = router;

//  1. jika tidak ada fn.otorisasi => maka public,
//  2. jika ada fn.otorisasi tanpa role => maka login,
//  3. jika ada fn.otorisasi dengan role => maka login dan role harus sesuai,
