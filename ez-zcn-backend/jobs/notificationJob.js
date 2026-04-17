// ============================================
// PennyWise — Notification Cron Jobs
//
// Three scheduled jobs:
// 1. Weekly tracker prompt  — Sunday 6 PM PKT
// 2. Re-engagement check    — Daily 9 AM PKT
// 3. Price change alerts    — Every 6 hours
//    (runs 5 min after inflation job)
// ============================================

const cron = require('node-cron');
const {
  sendWeeklyTrackerPrompt,
  checkInactiveUsersAndReengage,
  checkPriceChangesAndNotify,
} = require('../services/notificationService');

function startNotificationJobs() {

  // ── 1. Weekly Tracker Prompt: Sunday 6:00 PM PKT ──
  cron.schedule('0 18 * * 0', async () => {
    console.log(`\n📅 Cron — Weekly Tracker Prompt at ${new Date().toISOString()}`);
    try {
      await sendWeeklyTrackerPrompt();
    } catch (err) {
      console.error('Cron — Weekly prompt failed:', err.message);
    }
  }, {
    timezone: 'Asia/Karachi',
  });

  // ── 2. Re-engagement Check: Daily 9:00 AM PKT ──
  cron.schedule('0 9 * * *', async () => {
    console.log(`\n📅 Cron — Re-engagement check at ${new Date().toISOString()}`);
    try {
      await checkInactiveUsersAndReengage();
    } catch (err) {
      console.error('Cron — Re-engagement failed:', err.message);
    }
  }, {
    timezone: 'Asia/Karachi',
  });

  // ── 3. Price Change Alerts: Every 6 hours at :05 ──
  //    Runs 5 minutes after inflation job (which runs at :00)
  cron.schedule('5 */6 * * *', async () => {
    console.log(`\n📅 Cron — Price change check at ${new Date().toISOString()}`);
    try {
      await checkPriceChangesAndNotify();
    } catch (err) {
      console.error('Cron — Price check failed:', err.message);
    }
  }, {
    timezone: 'Asia/Karachi',
  });

  console.log('🔔 Notification Jobs — Scheduled:');
  console.log('   • Weekly prompt: Sunday 6 PM PKT');
  console.log('   • Re-engagement: Daily 9 AM PKT');
  console.log('   • Price alerts:  Every 6h at :05 PKT');
}

module.exports = { startNotificationJobs };
