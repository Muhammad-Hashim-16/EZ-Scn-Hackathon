// ============================================
// PennyWise — Inflation Cron Job
// Runs refreshAllPrices() every 6 hours
// Schedule: '0 */6 * * *'
// ============================================

const cron = require('node-cron');
const { refreshAllPrices } = require('../services/inflationService');

function startInflationJob() {
  // Run once on server start (non-blocking)
  setTimeout(async () => {
    console.log('📊 Inflation Job — Initial price seed on startup');
    try {
      await refreshAllPrices();
    } catch (err) {
      console.error('📊 Inflation Job — Startup seed failed:', err.message);
    }
  }, 5000); // 5 second delay to let DB pool warm up

  // Schedule every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log(`📊 Inflation Job — Scheduled run at ${new Date().toISOString()}`);
    try {
      await refreshAllPrices();
    } catch (err) {
      console.error('📊 Inflation Job — Cron run failed:', err.message);
    }
  }, {
    timezone: 'Asia/Karachi',
  });

  console.log('📊 Inflation Job — Scheduled (every 6 hours, PKT)');
}

module.exports = { startInflationJob };
