const { TOKEN_TYPES } = require('./auth.constants');

module.exports = (sequelize, DataTypes) => {
  const AuthToken = sequelize.define(
    'AuthToken',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
      },
      token: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM(TOKEN_TYPES.ACCESS, TOKEN_TYPES.REFRESH),
        allowNull: false,
        defaultValue: TOKEN_TYPES.REFRESH
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'revoked_at'
      }
    },
    {
      tableName: 'auth_tokens',
      timestamps: true,
      underscored: true
    }
  );

  return AuthToken;
};
