const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const db = require('./src/connection');
const apiRoutes = require('./src/routes');
const { handleLiveKitWebhook } = require('./src/@module/livekit/livekit.webhook');
const {
  startAcademyContestScheduler
} = require('./src/@module/academy-contest/academy-contest.scheduler');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true
  })
);

app.post(
  '/api/livekit/webhook',
  express.raw({ type: 'application/webhook+json' }),
  handleLiveKitWebhook
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Acadify API',
    version: '1.0.0'
  });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const connectDb = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    await db.sequelize.sync(isProduction ? {} : { alter: true });

    const tables = Object.keys(db).filter(
      (key) => key !== 'sequelize' && key !== 'Sequelize'
    );
    console.log('All tables synced successfully:', tables.join(', '));
  } catch (error) {
    console.error('Database sync failed:', error.message);
    console.error(error);
  }
};

const startServer = async () => {
  await connectDb();
  startAcademyContestScheduler();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

module.exports = app;
