require('dotenv').config();

const resolveLiveKitUrl = () => {
  if (process.env.LIVEKIT_URL) return process.env.LIVEKIT_URL;
  if (process.env.WEBSOCKET_URL) return process.env.WEBSOCKET_URL;

  const legacy = process.env.WEB_SOCKET_URL || '';
  if (legacy.startsWith('wss://') || legacy.startsWith('ws://')) {
    return legacy;
  }
  if (legacy.includes('wss://')) {
    return legacy.slice(legacy.indexOf('wss://'));
  }
  if (legacy.includes('ws://')) {
    return legacy.slice(legacy.indexOf('ws://'));
  }

  return '';
};

module.exports = {
  url: resolveLiveKitUrl(),
  apiKey: process.env.LIVEKIT_API_KEY || '',
  apiSecret: process.env.LIVEKIT_API_SECRET || '',
  webhookUrl: process.env.LIVEKIT_WEBHOOK_URL || process.env.WEBHOOK_URL || '',
  egressTemplateUrl: process.env.LIVEKIT_EGRESS_TEMPLATE_URL || ''
};
