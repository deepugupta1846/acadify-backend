const fromEmail =
  process.env.RESEND_FROM_EMAIL || 'Acadify <onboarding@resend.dev>';

const appUrl =
  process.env.APP_URL ||
  process.env.FRONTEND_URL ||
  'https://acadify.magadverse.com';

const adminEmail =
  process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || '';

const isConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

module.exports = {
  apiKey: process.env.RESEND_API_KEY,
  fromEmail,
  appUrl,
  adminEmail,
  isConfigured
};
