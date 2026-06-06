module.exports = (sequelize, DataTypes) => {
  const ClassSessionAssignment = sequelize.define(
    'ClassSessionAssignment',
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
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      instructions: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'due_date'
      },
      maxScore: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_score'
      }
    },
    {
      tableName: 'class_session_assignments',
      timestamps: true,
      underscored: true
    }
  );

  return ClassSessionAssignment;
};
