const MATERIAL_TYPES = ['attachment', 'note'];

module.exports = (sequelize, DataTypes) => {
  const ClassSessionMaterial = sequelize.define(
    'ClassSessionMaterial',
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
      type: {
        type: DataTypes.ENUM(...MATERIAL_TYPES),
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
      }
    },
    {
      tableName: 'class_session_materials',
      timestamps: true,
      underscored: true
    }
  );

  return ClassSessionMaterial;
};
