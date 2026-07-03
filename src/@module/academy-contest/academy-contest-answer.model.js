module.exports = (sequelize, DataTypes) => {
  const AcademyContestAnswer = sequelize.define(
    'AcademyContestAnswer',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      attemptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'attempt_id'
      },
      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'question_id'
      },
      selectedOptionId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: 'selected_option_id'
      },
      answerText: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'answer_text'
      },
      sourceCode: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        field: 'source_code'
      },
      language: {
        type: DataTypes.STRING(32),
        allowNull: true
      },
      verdict: {
        type: DataTypes.JSON,
        allowNull: true
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'is_correct'
      },
      answeredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'answered_at'
      }
    },
    {
      tableName: 'academy_contest_answers',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['attempt_id', 'question_id']
        }
      ]
    }
  );

  return AcademyContestAnswer;
};
