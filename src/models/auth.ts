export type AuthProviderId = 'email' | 'google';

export type AuthUser = {
  createdAt: string;
  displayName?: string | null;
  email: string;
  emailVerified: boolean;
  id: string;
  photoUrl?: string | null;
  provider: AuthProviderId;
  updatedAt: string;
};

export type AuthSession = {
  status: 'authenticated' | 'guest' | 'loading';
  user: AuthUser | null;
};

export type EmailPasswordLoginInput = {
  email: string;
  password: string;
};

export type EmailPasswordSignUpInput = EmailPasswordLoginInput & {
  name: string;
  passwordConfirmation: string;
};

export type LoginScreenParams =
  | {
      notice?: string;
      prefillEmail?: string;
    }
  | undefined;
