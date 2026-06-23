const { WebhookReceiver } = require('livekit-server-sdk');
const config = require('./livekit.config');
const livekitService = require('./livekit.service');
const db = require('../../connection');
const recordingService = require('../class/recording.service');
const sessionService = require('../class/session.service');

const receiver = new WebhookReceiver(config.apiKey, config.apiSecret);

const parseClassIdFromRoom = (roomName) => {
  const match = roomName?.match(/^acadify-class-(\d+)$/);
  return match ? match[1] : null;
};

const handleLiveKitWebhook = async (req, res) => {
  try {
    if (!config.apiKey || !config.apiSecret) {
      return res.status(500).json({ success: false, error: 'LiveKit not configured' });
    }

    const authHeader = req.get('Authorization') || '';
    const event = await receiver.receive(req.body, authHeader);

    if (event.event === 'room_finished' && event.room?.name) {
      const roomName = event.room.name;
      const classId = parseClassIdFromRoom(roomName);

      if (classId) {
        await sessionService.endSession(classId);
        await db.classroom.update(
          { isLive: false, liveStartedAt: null },
          { where: { id: classId, livekitRoomName: roomName } }
        );
      }
    }

    if (
      event.event === 'track_published' &&
      livekitService.isScreenShareTrackSource(event.track?.source) &&
      event.room?.name
    ) {
      const classId = parseClassIdFromRoom(event.room.name);

      if (classId) {
        const activeRecording = await recordingService.getActiveRecording(classId);

        if (activeRecording?.egressId) {
          try {
            await livekitService.updateRecordingLayout(
              activeRecording.egressId,
              'speaker'
            );
          } catch (layoutError) {
            console.error(
              'Failed to switch recording layout for screen share:',
              layoutError.message
            );
          }
        }
      }
    }

    if (
      (event.event === 'egress_ended' || event.event === 'egress_updated') &&
      event.egress
    ) {
      await recordingService.handleEgressEnded(event.egress);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('LiveKit webhook error:', error.message);
    return res.status(400).json({ success: false, error: 'Invalid webhook' });
  }
};

module.exports = { handleLiveKitWebhook };
