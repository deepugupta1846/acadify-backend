module.exports = (sequelize, DataTypes) => {
  const PasswordResetOtp = sequelize.define(
    'PasswordResetOtp',
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
      otpHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'otp_hash'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at'
      }
    },
    {
      tableName: 'password_reset_otps',
      timestamps: true,
      underscored: true
    }
  );

  return PasswordResetOtp;
};
