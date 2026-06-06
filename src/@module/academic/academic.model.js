module.exports = (sequelize, DataTypes) => {
  const Academy = sequelize.define(
    'Academy',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      slug: {
        type: DataTypes.STRING(180),
        allowNull: false,
        unique: true
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      postalCode: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      website: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('pending', 'active', 'rejected'),
        defaultValue: 'pending'
      }
    },
    {
      tableName: 'academies',
      timestamps: true,
      underscored: true
    }
  );

  return Academy;
};
