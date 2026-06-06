const CLASS_STATUS = ['active', 'inactive', 'archived'];

module.exports = (sequelize, DataTypes) => {
  const Classroom = sequelize.define(
    'Classroom',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      academyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'academy_id'
      },
      courseId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'course_id'
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by'
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      classCode: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
        field: 'class_code'
      },
      status: {
        type: DataTypes.ENUM(...CLASS_STATUS),
        defaultValue: 'active'
      },
      maxStudents: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_students'
      },
      classTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'class_time'
      },
      durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'duration_minutes'
      },
      isLive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_live'
      },
      liveStartedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'live_started_at'
      },
      livekitRoomName: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'livekit_room_name'
      }
    },
    {
      tableName: 'classes',
      timestamps: true,
      underscored: true
    }
  );

  return Classroom;
};
