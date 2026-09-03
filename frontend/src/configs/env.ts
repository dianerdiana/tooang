export const env = {
  nodeEnv: import.meta.env.VITE_NODE_ENV || 'production',
  baseServerUrl: import.meta.env.VITE_BASE_SERVER_URL || 'http://localhost:5000',
  baseApiUrl: import.meta.env.VITE_BASE_SERVER_URL + '/api' || 'http://localhost:5000/api',
  baseImageUrl: import.meta.env.VITE_BASE_SERVER_URL + '/' || 'http://localhost:5000',
};
