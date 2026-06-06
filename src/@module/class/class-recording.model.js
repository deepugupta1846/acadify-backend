const RECORDING_STATUS = ['recording', 'processing', 'completed', 'failed'];

module.exports = (sequelize, DataTypes) => {
  const ClassRecording = sequelize.define(
    'ClassRecording',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'class_id'
      },
      sessionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'session_id'
      },
      academyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'academy_id'
      },
      egressId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        field: 'egress_id'
      },
      filePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'file_path'
      },
      recordingUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'recording_url'
      },
      status: {
        type: DataTypes.ENUM(...RECORDING_STATUS),
        defaultValue: 'recording'
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'started_at'
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at'
      }
    },
    {
      tableName: 'class_recordings',
      timestamps: true,
      underscored: true
    }
  );

  return ClassRecording;
};
