// Change to your production URL before Phase 5 deploy
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://your-server.example.com'

export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001'
export const BOOTSTRAP_DISPLAY_NAME = 'Owner'
export const SYNC_INTERVAL_MS = 60_000

export const SECURE_KEYS = {
  TOKEN: 'pt_auth_token',
  USER_ID: 'pt_user_id',
  LAST_SYNCED_AT: 'pt_last_synced_at',
} as const
