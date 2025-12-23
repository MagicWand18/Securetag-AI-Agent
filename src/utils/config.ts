import dotenv from 'dotenv';

dotenv.config();

export const config = {
  logLevel: process.env.LOG_LEVEL || 'info',
};
