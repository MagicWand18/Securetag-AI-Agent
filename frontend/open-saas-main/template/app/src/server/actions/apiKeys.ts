import { ApiKey, User } from "wasp/entities";
import { HttpError } from "wasp/server";
import crypto from 'crypto';

const SECURETAG_API_URL = process.env.SECURETAG_API_URL || 'http://securetag-nginx:80';
const SYSTEM_SECRET = process.env.SECURETAG_SYSTEM_SECRET;

async function syncToBackend(method: 'POST' | 'DELETE', endpoint: string, data: any) {
  if (!SYSTEM_SECRET) {
    console.warn('Skipping backend sync: SECURETAG_SYSTEM_SECRET not set');
    return;
  }

  try {
    const response = await fetch(`${SECURETAG_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-SecureTag-System-Secret': SYSTEM_SECRET
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Backend sync failed (${response.status}): ${text}`);
    }
  } catch (error) {
    console.error('Backend sync error:', error);
    throw new HttpError(500, "Failed to sync API Key with backend security system");
  }
}

type CreateApiKeyArgs = {
  label: string;
};

type DeleteApiKeyArgs = {
  id: string;
};

export const getApiKeys = async (args: void, context: any) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.ApiKey.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
  });
};

export const createApiKey = async (args: CreateApiKeyArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  if (!args.label) {
    throw new HttpError(400, "Label is required");
  }

  // Generate a secure random key
  // Format: st_live_<random_hex>
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const plainKey = `st_live_${randomBytes}`;
  const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

  const apiKey = await context.entities.ApiKey.create({
    data: {
      key: keyHash, // Store hash locally
      label: args.label,
      user: { connect: { id: context.user.id } },
    },
  });

  try {
    await syncToBackend('POST', '/api/v1/auth/sync-key', {
      user_id: context.user.id,
      key_hash: keyHash,
      label: args.label
    });
  } catch (error) {
    // Rollback local creation if sync fails
    await context.entities.ApiKey.delete({ where: { id: apiKey.id } });
    throw error;
  }

  // Return the plain key to the user ONLY ONCE
  return {
    ...apiKey,
    key: plainKey
  };
};

export const deleteApiKey = async (args: DeleteApiKeyArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const apiKey = await context.entities.ApiKey.findUnique({
    where: { id: args.id },
  });

  if (!apiKey || apiKey.userId !== context.user.id) {
    throw new HttpError(404, "API Key not found");
  }

  // Sync delete to backend first
  // apiKey.key is already the hash in DB
  await syncToBackend('DELETE', '/api/v1/auth/sync-key', { key_hash: apiKey.key });

  return context.entities.ApiKey.delete({
    where: { id: args.id },
  });
};
