import axios from 'axios';
import { HttpError } from 'wasp/server';

export const createSecuretagClient = (apiKey: string) => {
  const client = axios.create({
    baseURL: process.env.SECURETAG_API_URL,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      // Required for Nginx proxy to accept the request, as it filters by server_name
      'Host': process.env.SECURETAG_API_HOST || 'api.securetag.com.mx',
    },
    timeout: 10000, // 10s timeout
  });

  // Interceptor para manejo de errores estandarizado
  client.interceptors.response.use(
    response => response,
    error => {
      // Log error interno
      console.error('Securetag API Error:', error.message);
      
      if (error.response?.status === 401) {
        throw new HttpError(401, 'Invalid or expired Securetag API Key');
      }
      // If we can't reach the server (network error), it might not have a response
      if (!error.response) {
         throw new HttpError(502, 'Bad Gateway: Failed to contact Securetag API (Network Error)');
      }
      
      // For other errors, re-throw the original axios error so the caller can handle specific status codes (404, 400, etc.)
      return Promise.reject(error);
    }
  );

  return client;
};

export const createSystemClient = (userId: string) => {
  const systemSecret = process.env.SECURETAG_SYSTEM_SECRET;
  if (!systemSecret) {
    console.warn('SECURETAG_SYSTEM_SECRET is not configured. Backend sync may fail.');
  }

  const client = axios.create({
    baseURL: process.env.SECURETAG_API_URL,
    headers: {
      'X-SecureTag-System-Secret': systemSecret || '',
      'X-SecureTag-User-Id': userId,
      'Content-Type': 'application/json',
      // Required for Nginx proxy to accept the request, as it filters by server_name
      'Host': process.env.SECURETAG_API_HOST || 'api.securetag.com.mx',
    },
    timeout: 10000, // 10s timeout
  });

  // Interceptor para manejo de errores estandarizado
  client.interceptors.response.use(
    response => response,
    error => {
      // Log error interno
      console.error('Securetag System API Error:', error.message);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new HttpError(403, 'System Auth Failed: Invalid Secret or Permissions');
      }
      // If we can't reach the server (network error), it might not have a response
      if (!error.response) {
         throw new HttpError(502, 'Bad Gateway: Failed to contact Securetag API (Network Error)');
      }
      
      return Promise.reject(error);
    }
  );

  return client;
};
