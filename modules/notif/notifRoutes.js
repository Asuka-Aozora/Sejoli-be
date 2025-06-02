const express = require('express');
const router = express.Router();
const c = require('./notifController');
const fn = require('../../common/fn');

router.get('/send', async (req, res) => {
  // await controller.sendNotifications();
  // res.send('Notifikasi dikirim!');
});

module.exports = router;


 