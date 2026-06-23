const {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  AzureBlobUpload,
  TrackSource,
  EncodingOptionsPreset
} = require('livekit-server-sdk');
const config = require('./livekit.config');
const azureConfig = require('../storage/azure.config');
const { USER_TYPES } = require('../auth/auth.constants');

const TOKEN_TTL = '4h';
const SCREEN_SHARE_SOURCE =
  TrackSource?.SCREEN_SHARE !== undefined ? TrackSource.SCREEN_SHARE : 3;
const SCREEN_SHARE_AUDIO_SOURCE =
  TrackSource?.SCREEN_SHARE_AUDIO !== undefined
    ? TrackSource.SCREEN_SHARE_AUDIO
    : 4;
const MICROPHONE_SOURCE =
  TrackSource?.MICROPHONE !== undefined ? TrackSource.MICROPHONE : 2;
const RECORDING_ENCODING = {
  encodingOptions: EncodingOptionsPreset.H264_1080P_30
};

const normalizeTrackSource = (source) => {
  if (typeof source === 'number') return source;
  if (typeof source === 'string') {
    const normalized = source.trim().toUpperCase().replace(/-/g, '_');
    if (normalized === 'SCREEN_SHARE' || normalized === 'SCREENSHARE') {
      return SCREEN_SHARE_SOURCE;
    }
    if (
      normalized === 'SCREEN_SHARE_AUDIO' ||
      normalized === 'SCREENSHARE_AUDIO'
    ) {
      return SCREEN_SHARE_AUDIO_SOURCE;
    }
    if (normalized === 'MICROPHONE' || normalized === 'MIC') {
      return MICROPHONE_SOURCE;
    }
    if (normalized === 'CAMERA') return TrackSource?.CAMERA ?? 1;
  }
  return source;
};

const isScreenShareSource = (source) =>
  normalizeTrackSource(source) === SCREEN_SHARE_SOURCE;

const isScreenShareAudioSource = (source) =>
  normalizeTrackSource(source) === SCREEN_SHARE_AUDIO_SOURCE;

const isMicrophoneSource = (source) =>
  normalizeTrackSource(source) === MICROPHONE_SOURCE;

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

const buildEncodedFileOutput = (classId) => {
  const filePath = `recordings/class-${classId}/${Date.now()}.mp4`;

  return {
    filePath,
    output: new EncodedFileOutput({
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
    })
  };
};

const resolveHostIdentity = async (roomName, preferredHostIdentity) => {
  const roomService = getRoomService();
  const participants = await roomService.listParticipants(roomName);

  if (preferredHostIdentity) {
    const preferred = participants.find(
      (participant) => participant.identity === preferredHostIdentity
    );
    if (preferred) return preferredHostIdentity;
  }

  const academicParticipant = participants.find((participant) =>
    participant.identity?.startsWith(`${USER_TYPES.ACADEMIC}-`)
  );

  return academicParticipant?.identity || null;
};

const hasScreenShareTrack = (participant) =>
  (participant?.tracks || []).some(
    (track) => isScreenShareSource(track.source) && track.sid
  );

const getScreenShareTracks = (participant) => {
  const tracks = participant?.tracks || [];
  const video = tracks.find(
    (track) => isScreenShareSource(track.source) && track.sid
  );

  if (!video) return null;

  const audio =
    tracks.find(
      (track) => isScreenShareAudioSource(track.source) && track.sid
    ) ||
    tracks.find((track) => isMicrophoneSource(track.source) && track.sid);

  return {
    videoTrackId: video.sid,
    audioTrackId: audio?.sid || ''
  };
};

const listRoomParticipants = async (roomName) => {
  const roomService = getRoomService();
  const participants = await roomService.listParticipants(roomName);

  return Promise.all(
    participants.map(async (participant) => {
      if (!participant?.identity) return participant;

      try {
        return await roomService.getParticipant(roomName, participant.identity);
      } catch {
        return participant;
      }
    })
  );
};

const pickScreenShareParticipant = (participants) => {
  const candidates = participants.filter(hasScreenShareTrack);
  if (!candidates.length) return null;

  const academic = candidates.find((participant) =>
    participant.identity?.startsWith(`${USER_TYPES.ACADEMIC}-`)
  );
  if (academic) return academic;

  const student = candidates.find((participant) =>
    participant.identity?.startsWith(`${USER_TYPES.STUDENT}-`)
  );
  if (student) return student;

  return candidates[0];
};

const resolveScreenShareParticipant = async (roomName) => {
  const participants = await listRoomParticipants(roomName);
  const candidate = pickScreenShareParticipant(participants);

  if (!candidate?.identity) return null;

  const tracks = getScreenShareTracks(candidate);
  if (!tracks) return null;

  return {
    identity: candidate.identity,
    tracks
  };
};

const startScreenShareRecording = async (
  egressClient,
  roomName,
  output,
  screenShare
) => {
  try {
    return await egressClient.startParticipantEgress(
      roomName,
      screenShare.identity,
      { file: output },
      {
        screenShare: true,
        ...RECORDING_ENCODING
      }
    );
  } catch {
    return egressClient.startTrackCompositeEgress(
      roomName,
      { file: output },
      {
        videoTrackId: screenShare.tracks.videoTrackId,
        audioTrackId: screenShare.tracks.audioTrackId,
        ...RECORDING_ENCODING
      }
    );
  }
};

const startRoomCompositeRecording = async (egressClient, roomName, output) => {
  const options = {
    layout: 'grid',
    ...RECORDING_ENCODING
  };

  if (config.egressTemplateUrl) {
    options.customBaseUrl = config.egressTemplateUrl;
  }

  return egressClient.startRoomCompositeEgress(
    roomName,
    { file: output },
    options
  );
};

const startHostRecording = async ({ roomName, classId, hostIdentity }) => {
  ensureAzureConfigured();

  const resolvedHostIdentity = await resolveHostIdentity(roomName, hostIdentity);

  if (!resolvedHostIdentity) {
    const error = new Error(
      'Host must join the live class before recording can start'
    );
    error.status = 400;
    throw error;
  }

  const { filePath, output } = buildEncodedFileOutput(classId);
  const egressClient = getEgressClient();
  const screenShare = await resolveScreenShareParticipant(roomName);

  if (screenShare) {
    const egress = await startScreenShareRecording(
      egressClient,
      roomName,
      output,
      screenShare
    );

    return {
      egressId: egress.egressId,
      filePath,
      hostIdentity: screenShare.identity,
      captureMode: 'screen_share'
    };
  }

  const egress = await startRoomCompositeRecording(
    egressClient,
    roomName,
    output
  );

  return {
    egressId: egress.egressId,
    filePath,
    hostIdentity: resolvedHostIdentity,
    captureMode: 'room_composite'
  };
};

const startRoomRecording = async ({ roomName, classId, hostIdentity }) =>
  startHostRecording({ roomName, classId, hostIdentity });

const stopRoomRecording = async (egressId) => {
  const egressClient = getEgressClient();
  return egressClient.stopEgress(egressId);
};

const updateRecordingLayout = async (egressId, layout) => {
  const egressClient = getEgressClient();
  return egressClient.updateLayout(egressId, layout);
};

const isScreenShareTrackSource = (source) => isScreenShareSource(source);

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
  startHostRecording,
  startRoomRecording,
  stopRoomRecording,
  updateRecordingLayout,
  isScreenShareTrackSource,
  getEgressInfo,
  getConfig: () => ({
    url: config.url,
    webhookUrl: config.webhookUrl,
    configured: Boolean(config.url && config.apiKey && config.apiSecret),
    azureConfigured: azureConfig.isConfigured()
  })
};
