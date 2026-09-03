import type { ErrorResponse } from './api-response.type';

import '@tanstack/react-query';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ErrorResponse; // Ubah sesuai tipe error Anda
  }
}
