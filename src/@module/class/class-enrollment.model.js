module.exports = (sequelize, DataTypes) => {
  const ClassEnrollment = sequelize.define(
    'ClassEnrollment',
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
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'student_id'
      },
      academyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'academy_id'
      }
    },
    {
      tableName: 'class_enrollments',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['class_id', 'student_id']
        }
      ]
    }
  );

  return ClassEnrollment;
};
