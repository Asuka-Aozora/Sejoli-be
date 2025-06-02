const express = require('express');
const router = express.Router();
const { startScheduler } = require('./runEveryController');

// Langsung jalan saat file di-load
startScheduler();

router.get('/', (req, res) => {
  res.send('Scheduler aktif.');
});

module.exports = router;
