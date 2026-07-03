const ATTEMPT_STATUS = ['in_progress', 'submitted', 'auto_submitted'];

module.exports = (sequelize, DataTypes) => {
  const AcademyContestAttempt = sequelize.define(
    'AcademyContestAttempt',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      contestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'contest_id'
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'student_id'
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'started_at'
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submitted_at'
      },
      status: {
        type: DataTypes.ENUM(...ATTEMPT_STATUS),
        allowNull: false,
        defaultValue: 'in_progress'
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: 'academy_contest_attempts',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['contest_id', 'student_id']
        }
      ]
    }
  );

  return AcademyContestAttempt;
};
