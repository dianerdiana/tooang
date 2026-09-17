const DEFAULT_SERVER_URL = 'http://localhost:5000';

export const buildApiBaseUrl = (serverUrl: string | undefined) => {
  const normalizedServerUrl = (serverUrl || DEFAULT_SERVER_URL).trim().replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(normalizedServerUrl)) {
    throw new Error('VITE_BASE_SERVER_URL must be an absolute HTTP(S) URL');
  }

  return `${normalizedServerUrl}/api/v1`;
};

const baseServerUrl = (import.meta.env.VITE_BASE_SERVER_URL || DEFAULT_SERVER_URL).trim().replace(/\/+$/, '');

export const env = {
  nodeEnv: import.meta.env.MODE,
  baseServerUrl,
  baseApiUrl: buildApiBaseUrl(baseServerUrl),
  baseImageUrl: `${baseServerUrl}/`,
};
