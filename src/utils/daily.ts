/**
 * Daily.co API integration utility
 */

const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const DAILY_API_URL = 'https://api.daily.co/v1';

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  config: {
    enable_prejoin_ui: boolean;
    enable_knocking: boolean;
    enable_screenshare: boolean;
    enable_chat: boolean;
    exp?: number;
  };
}

export interface CreateRoomOptions {
  name?: string;
  privacy?: 'public' | 'private';
  properties?: {
    enable_prejoin_ui?: boolean;
    enable_knocking?: boolean;
    enable_screenshare?: boolean;
    enable_chat?: boolean;
    exp?: number; // Unix timestamp for expiration
  };
}

/**
 * Create a Daily.co room
 */
export async function createDailyRoom(
  title: string,
  scheduledAt: Date,
  options?: CreateRoomOptions
): Promise<{ roomUrl: string; roomName: string; meetingId: string }> {
  if (!DAILY_API_KEY) {
    throw new Error('Daily.co API key not configured. Set DAILY_API_KEY environment variable.');
  }

  const roomName = options?.name || `workshop-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const expirationTime = Math.floor(scheduledAt.getTime() / 1000) + 3600; // 1 hour after start

  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: options?.privacy || 'private',
      properties: {
        enable_prejoin_ui: options?.properties?.enable_prejoin_ui ?? true,
        enable_knocking: options?.properties?.enable_knocking ?? true,
        enable_screenshare: options?.properties?.enable_screenshare ?? true,
        enable_chat: options?.properties?.enable_chat ?? true,
        exp: expirationTime,
        ...options?.properties,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Daily.co API error: ${error}`);
  }

  const data: DailyRoom = await response.json();
  return {
    roomUrl: data.url,
    roomName: data.name,
    meetingId: data.id,
  };
}

/**
 * Get room details
 */
export async function getDailyRoom(roomName: string): Promise<DailyRoom | null> {
  if (!DAILY_API_KEY) {
    throw new Error('Daily.co API key not configured');
  }

  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Daily.co API error: ${error}`);
  }

  return response.json();
}

/**
 * Delete a Daily.co room
 */
export async function deleteDailyRoom(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) {
    throw new Error('Daily.co API key not configured');
  }

  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Daily.co API error: ${error}`);
  }
}

/**
 * Generate meeting token for a room (for pre-authenticated access)
 */
export async function createMeetingToken(
  roomName: string,
  userId: string,
  isOwner: boolean = false
): Promise<string> {
  if (!DAILY_API_KEY) {
    throw new Error('Daily.co API key not configured');
  }

  const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        is_owner: isOwner,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Daily.co API error: ${error}`);
  }

  const data = await response.json();
  return data.token;
}
