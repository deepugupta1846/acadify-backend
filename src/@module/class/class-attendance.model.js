module.exports = (sequelize, DataTypes) => {
  const ClassAttendance = sequelize.define(
    'ClassAttendance',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      sessionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'session_id'
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'class_id'
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'student_id'
      },
      status: {
        type: DataTypes.ENUM('present'),
        defaultValue: 'present'
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'joined_at'
      }
    },
    {
      tableName: 'class_attendance',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['session_id', 'student_id']
        }
      ]
    }
  );

  return ClassAttendance;
};
