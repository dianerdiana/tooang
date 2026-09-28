import { getSafeRedirectTarget } from './route-guard';

const INTENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthEntrySearch = {
  intent?: string;
  redirect?: string;
  registered?: boolean;
};

function parseAuthEntrySearch(search: Record<string, unknown>): AuthEntrySearch {
  const intent =
    typeof search.intent === 'string' && INTENT_ID_PATTERN.test(search.intent)
      ? search.intent.toLowerCase()
      : undefined;
  const registered = search.registered === true || search.registered === 'true' ? true : undefined;

  return {
    redirect: getSafeRedirectTarget(typeof search.redirect === 'string' ? search.redirect : undefined),
    ...(intent ? { intent } : {}),
    ...(registered ? { registered } : {}),
  };
}

function buildAuthEntrySearch(search: Partial<AuthEntrySearch>): AuthEntrySearch {
  return parseAuthEntrySearch(search as Record<string, unknown>);
}

export { buildAuthEntrySearch, parseAuthEntrySearch };
export type { AuthEntrySearch };
