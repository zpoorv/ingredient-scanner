import type { AuthSession } from '../models/auth';

type AuthSessionListener = (session: AuthSession) => void;

const listeners = new Set<AuthSessionListener>();

let currentAuthSession: AuthSession = {
  status: 'loading',
  user: null,
};

export function getAuthSession() {
  return currentAuthSession;
}

export function setAuthSession(nextSession: AuthSession) {
  currentAuthSession = nextSession;
  listeners.forEach((listener) => listener(currentAuthSession));
}

export function subscribeAuthSession(listener: AuthSessionListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
