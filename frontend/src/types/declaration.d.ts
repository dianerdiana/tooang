import type { ApplicationError } from './api-response.type';

import '@tanstack/react-query';

declare global {
  interface ImportMetaEnv {
    readonly VITE_BASE_SERVER_URL: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApplicationError;
  }
}
