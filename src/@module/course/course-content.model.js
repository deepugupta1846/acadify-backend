const CONTENT_TYPES = ['lesson', 'video', 'attachment'];

module.exports = (sequelize, DataTypes) => {
  const CourseContent = sequelize.define(
    'CourseContent',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'course_id'
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
      type: {
        type: DataTypes.ENUM(...CONTENT_TYPES),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      videoUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'video_url'
      },
      fileName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'file_name'
      },
      filePath: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'file_path'
      },
      fileUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'file_url'
      },
      mimeType: {
        type: DataTypes.STRING(128),
        allowNull: true,
        field: 'mime_type'
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'file_size'
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order'
      }
    },
    {
      tableName: 'course_contents',
      timestamps: true,
      underscored: true
    }
  );

  return CourseContent;
};
