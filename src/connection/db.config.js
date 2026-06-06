module.exports = {
  DB: process.env.DATABASE_NAME  || 'acadify_database',
  USER: process.env.DATABASE_USER || 'root',
  PASSORD: process.env.DATABASE_PASSWORD || 'admin',
  HOST: process.env.DATABASE_HOST || '127.0.0.1',
  PORT: process.env.DATABASE_PORT || 3306,
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
