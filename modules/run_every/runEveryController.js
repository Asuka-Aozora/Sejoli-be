const notif = require('../notif/notifController');

// Fungsi ini dipanggil setiap 1 menit
exports.startScheduler = () => {
  console.log('Start scheduler... (runEveryController.js)');
  setInterval(async () => {
    console.log('Running scheduled task...');
    await notif.sendNotifNextPayment();
  }, 60 * 1000); // 60 detik
};
