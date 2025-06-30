const fs = require('fs');
const path = require('path');

// Get the environment from command line arguments
const env = process.argv[2] || 'development';

if (!['development', 'production'].includes(env)) {
  console.error('Invalid environment. Use "development" or "production"');
  process.exit(1);
}

console.log(`Setting environment to: ${env}`);

// Path to the environment file
const envFile = path.resolve(__dirname, '..', env === 'production' ? '.env.production' : '.env');

// Check if the environment file exists
if (!fs.existsSync(envFile)) {
  console.error(`Environment file not found: ${envFile}`);
  process.exit(1);
}

// For production, copy .env.production to .env
if (env === 'production') {
  fs.copyFileSync(envFile, path.resolve(__dirname, '..', '.env'));
  console.log(`Environment set to ${env}. .env file updated from .env.production.`);
} else {
  console.log(`Environment set to ${env}. Using existing .env file.`);
} 