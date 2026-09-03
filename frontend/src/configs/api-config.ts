import { createJwt } from './auth/jwt-service';
import { env } from './env';

export const api = createJwt({ baseURL: env.baseApiUrl });
