const COURSE_STATUS = ['draft', 'published', 'archived'];
const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'];

module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define(
    'Course',
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
      slug: {
        type: DataTypes.STRING(220),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM(...COURSE_STATUS),
        defaultValue: 'draft'
      },
      level: {
        type: DataTypes.ENUM(...COURSE_LEVELS),
        defaultValue: 'beginner'
      },
      durationHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'duration_hours'
      }
    },
    {
      tableName: 'courses',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['academy_id', 'slug']
        }
      ]
    }
  );

  return Course;
};
