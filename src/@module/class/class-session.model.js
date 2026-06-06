const SESSION_STATUS = ['live', 'ended'];

module.exports = (sequelize, DataTypes) => {
  const ClassSession = sequelize.define(
    'ClassSession',
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
      academyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'academy_id'
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'started_at'
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'ended_at'
      },
      recordingUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'recording_url'
      },
      status: {
        type: DataTypes.ENUM(...SESSION_STATUS),
        defaultValue: 'live'
      }
    },
    {
      tableName: 'class_sessions',
      timestamps: true,
      underscored: true
    }
  );

  return ClassSession;
};
