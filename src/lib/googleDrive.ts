const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '516963449880-glbojakq37njk6c44sarqfo5j7jm43gu.apps.googleusercontent.com';
const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
// drive.file only grants access to files this app creates, so the backup is visible in Drive but nothing else is touched.
const GOOGLE_SCOPES = 'openid email https://www.googleapis.com/auth/drive.file';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;

const DRIVE_BACKUP_FILE_NAME = 'CouchMapper.json';

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleTokenClientConfig = {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
};

type GoogleIdentityGlobal = {
  accounts: {
    oauth2: {
      initTokenClient: (config: GoogleTokenClientConfig) => { requestAccessToken: (options?: { prompt?: string }) => void };
      revoke: (accessToken: string, done?: () => void) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityGlobal;
  }
}

type DriveSession = {
  accessToken: string;
  expiresAt: number;
  email?: string;
};

let session: DriveSession | null = null;
const sessionListeners = new Set<() => void>();
let identityScriptPromise: Promise<void> | null = null;

function setSession(next: DriveSession | null) {
  session = next;
  sessionListeners.forEach((listener) => listener());
}

export function isGoogleDriveConfigured(): boolean {
  return GOOGLE_CLIENT_ID !== '';
}

export function subscribeGoogleDriveSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

// Returns the same object until the session changes, so it can back useSyncExternalStore.
export function getGoogleDriveSession(): Pick<DriveSession, 'email'> | null {
  return session;
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve();

  identityScriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      identityScriptPromise = null;
      script.remove();
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(script);
  });

  return identityScriptPromise;
}

async function requestAccessToken(prompt: '' | 'select_account'): Promise<{ accessToken: string; expiresAt: number }> {
  await loadGoogleIdentityScript();
  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) throw new Error('Google sign-in is not available');

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description ?? response.error ?? 'Google sign-in failed'));
          return;
        }
        const lifetime = response.expires_in ?? DEFAULT_TOKEN_LIFETIME_SECONDS;
        resolve({ accessToken: response.access_token, expiresAt: Date.now() + lifetime * 1000 });
      },
      error_callback: (error) => {
        reject(new Error(error.type === 'popup_closed' ? 'Google sign-in was closed' : 'Google sign-in failed'));
      },
    });
    client.requestAccessToken({ prompt });
  });
}

async function fetchAccountEmail(accessToken: string): Promise<string | undefined> {
  try {
    const response = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return undefined;
    const { email } = await response.json() as { email?: string };
    return email;
  } catch {
    return undefined;
  }
}

async function getAccessToken(): Promise<string> {
  if (!session) throw new Error('Sign in with Google first');
  if (session.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) return session.accessToken;

  const token = await requestAccessToken('');
  setSession({ ...token, email: session.email });
  return token.accessToken;
}

async function driveFetch(url: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    setSession(null);
    throw new Error('Google sign-in expired. Sign in again.');
  }
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`);

  return response;
}

async function findDriveBackupFileId(accessToken: string): Promise<string | undefined> {
  const params = new URLSearchParams({
    q: `name = '${DRIVE_BACKUP_FILE_NAME}' and trashed = false`,
    spaces: 'drive',
    fields: 'files(id)',
    orderBy: 'modifiedTime desc',
    pageSize: '1',
  });
  const response = await driveFetch(`${DRIVE_FILES_URL}?${params}`, accessToken);
  const { files } = await response.json() as { files?: { id: string }[] };

  return files?.[0]?.id;
}

export async function signInToGoogleDrive(): Promise<void> {
  const token = await requestAccessToken('select_account');
  const email = await fetchAccountEmail(token.accessToken);
  setSession({ ...token, email });
}

export function signOutOfGoogleDrive(): void {
  if (session) window.google?.accounts.oauth2.revoke(session.accessToken);
  setSession(null);
}

export async function uploadDriveBackup(content: string): Promise<void> {
  const accessToken = await getAccessToken();
  const existingFileId = await findDriveBackupFileId(accessToken);

  // Multipart upload: the first part carries the file metadata, the second the JSON content.
  const boundary = `couchmapper-${Date.now().toString(36)}`;
  const metadata = { name: DRIVE_BACKUP_FILE_NAME, mimeType: 'application/json' };
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  await driveFetch(
    existingFileId
      ? `${DRIVE_UPLOAD_URL}/${existingFileId}?uploadType=multipart`
      : `${DRIVE_UPLOAD_URL}?uploadType=multipart`,
    accessToken,
    {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}

export async function downloadDriveBackup(): Promise<string> {
  const accessToken = await getAccessToken();
  const fileId = await findDriveBackupFileId(accessToken);
  if (!fileId) throw new Error(`No ${DRIVE_BACKUP_FILE_NAME} found in Google Drive`);

  const response = await driveFetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, accessToken);
  return response.text();
}
