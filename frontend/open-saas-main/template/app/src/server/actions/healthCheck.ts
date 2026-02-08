import { HttpError } from 'wasp/server';
import { createSecuretagClient } from '../securetagClient';

export const checkApiConnection = async (_args: any, context: any) => {
  // Use a temporary test key if no user context is available for this health check
  // In production, this should likely be a system-level check or require admin auth
  const apiKey = context.user?.securetagApiKey || process.env.SECURETAG_API_KEY_TEST || 'test-key';
  
  const client = createSecuretagClient(apiKey);
  
  try {
    // Try to hit a lightweight endpoint.
    // Since we might not know a valid endpoint for "health" on the real backend yet,
    // we'll try a generic root or specific health endpoint.
    // Adjust '/health' to whatever the real Securetag API supports for ping.
    const response = await client.get('/healthz'); 
    
    return {
      status: 'ok',
      message: 'Successfully connected to Securetag API',
      statusCode: response.status,
      data: response.data
    };
  } catch (error: any) {
    console.error('Health Check Failed:', error.message);
    // Return error details instead of throwing, so the UI can display "Disconnected" status
    return {
      status: 'error',
      message: error.message || 'Failed to connect',
      statusCode: error.statusCode || 500
    };
  }
};
