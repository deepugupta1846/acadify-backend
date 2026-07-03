module.exports = (sequelize, DataTypes) => {
  const AcademyContest = sequelize.define(
    'AcademyContest',
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
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by'
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      startAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_at'
      },
      durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'duration_minutes'
      },
      endAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_at'
      },
      notifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'notified_at'
      },
      liveNotifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'live_notified_at'
      }
    },
    {
      tableName: 'academy_contests',
      timestamps: true,
      underscored: true
    }
  );

  return AcademyContest;
};
