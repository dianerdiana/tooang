export interface AccessTokenPayload {
  readonly userId: string;
}

export interface RefreshTokenPayload {
  readonly userId: string;
  readonly sessionId: string;
  readonly familyId: string;
}
