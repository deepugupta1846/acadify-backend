const {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  AzureBlobUpload
} = require('livekit-server-sdk');
const config = require('./livekit.config');
const azureConfig = require('../storage/azure.config');

const TOKEN_TTL = '4h';

const ensureConfigured = () => {
  if (!config.url || !config.apiKey || !config.apiSecret) {
    const error = new Error(
      'LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env'
    );
    error.status = 500;
    throw error;
  }
};

const buildRoomName = (classId) => `acadify-class-${classId}`;

const getHttpUrl = () =>
  config.url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');

const getRoomService = () => {
  ensureConfigured();
  return new RoomServiceClient(getHttpUrl(), config.apiKey, config.apiSecret);
};

const getEgressClient = () => {
  ensureConfigured();
  return new EgressClient(getHttpUrl(), config.apiKey, config.apiSecret);
};

const ensureAzureConfigured = () => {
  if (!azureConfig.isConfigured()) {
    const error = new Error(
      'Azure storage is not configured. Set AZURE_STORAGE_KEY in .env (account key for LiveKit upload).'
    );
    error.status = 500;
    throw error;
  }
};

const startRoomRecording = async ({ roomName, classId }) => {
  ensureAzureConfigured();

  const filePath = `recordings/class-${classId}/${Date.now()}.mp4`;
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: filePath,
    output: {
      case: 'azure',
      value: new AzureBlobUpload({
        accountName: azureConfig.accountName,
        accountKey: azureConfig.accountKey,
        containerName: azureConfig.containerName
      })
    }
  });

  const egressClient = getEgressClient();
  const egress = await egressClient.startRoomCompositeEgress(roomName, output);

  return {
    egressId: egress.egressId,
    filePath
  };
};

const stopRoomRecording = async (egressId) => {
  const egressClient = getEgressClient();
  return egressClient.stopEgress(egressId);
};

const getEgressInfo = async (egressId) => {
  const egressClient = getEgressClient();
  const items = await egressClient.listEgress({ egressId });
  return items[0] || null;
};

const createParticipantToken = async ({ identity, name, roomName, role }) => {
  ensureConfigured();

  const isHost = role === 'host';

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name,
    ttl: TOKEN_TTL
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    hidden: false,
    recorder: false
  });

  if (isHost) {
    token.addGrant({
      roomAdmin: true,
      roomCreate: true
    });
  }

  return token.toJwt();
};

const ensureRoom = async (roomName, className) => {
  const roomService = getRoomService();

  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 60 * 10,
      maxParticipants: 100,
      metadata: JSON.stringify({ className })
    });
  } catch (error) {
    if (!String(error.message || '').toLowerCase().includes('already exists')) {
      throw error;
    }
  }
};

const deleteRoom = async (roomName) => {
  try {
    const roomService = getRoomService();
    await roomService.deleteRoom(roomName);
  } catch {
    /* room may already be closed */
  }
};

const buildLiveKitPayload = ({ roomName, token, role }) => ({
  url: config.url,
  roomName,
  token,
  role
});

module.exports = {
  buildRoomName,
  createParticipantToken,
  ensureRoom,
  deleteRoom,
  buildLiveKitPayload,
  startRoomRecording,
  stopRoomRecording,
  getEgressInfo,
  getConfig: () => ({
    url: config.url,
    webhookUrl: config.webhookUrl,
    configured: Boolean(config.url && config.apiKey && config.apiSecret),
    azureConfigured: azureConfig.isConfigured()
  })
};
