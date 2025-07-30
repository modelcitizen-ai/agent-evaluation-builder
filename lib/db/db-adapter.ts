// Database adapter - dynamically exports either localStorage or PostgreSQL adapter
// Based on the USE_POSTGRESQL environment variable

const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true';

if (USE_POSTGRESQL) {
  // Use PostgreSQL adapter
  console.log('🐘 Using PostgreSQL database adapter');
  module.exports = require('./postgresql-adapter');
} else {
  // Use localStorage adapter (default)
  console.log('💾 Using localStorage database adapter');
  module.exports = require('./localStorage-adapter');
}
