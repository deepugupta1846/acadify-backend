const QUESTION_TYPES = ['objective', 'theoretical', 'coding'];

module.exports = (sequelize, DataTypes) => {
  const AcademyContestQuestion = sequelize.define(
    'AcademyContestQuestion',
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
      type: {
        type: DataTypes.ENUM(...QUESTION_TYPES),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      prompt: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order'
      },
      options: {
        type: DataTypes.JSON,
        allowNull: true
      },
      codingProblemSlug: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'coding_problem_slug'
      }
    },
    {
      tableName: 'academy_contest_questions',
      timestamps: true,
      underscored: true
    }
  );

  return AcademyContestQuestion;
};
