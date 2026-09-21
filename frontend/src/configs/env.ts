const API_ROOT = '/api/v1';

export const normalizeServerOrigin = (serverUrl: string | undefined) => {
  const value = serverUrl?.trim();

  if (!value) {
    throw new Error('VITE_BASE_SERVER_URL is required');
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_BASE_SERVER_URL must be an absolute HTTP(S) origin');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_BASE_SERVER_URL must be an absolute HTTP(S) origin');
  }

  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_BASE_SERVER_URL must contain only the server origin');
  }

  return url.origin;
};

export const buildApiBaseUrl = (serverUrl: string | undefined) => `${normalizeServerOrigin(serverUrl)}${API_ROOT}`;

const baseServerUrl = normalizeServerOrigin(import.meta.env.VITE_BASE_SERVER_URL);

export const env = {
  nodeEnv: import.meta.env.MODE,
  baseServerUrl,
  baseApiUrl: buildApiBaseUrl(baseServerUrl),
  baseImageUrl: `${baseServerUrl}/`,
};
