import type {
  EmailPasswordLoginInput,
  EmailPasswordSignUpInput,
} from '../models/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmailAddress(email: string) {
  const normalizedEmail = normalizeAuthEmail(email);

  if (!normalizedEmail) {
    return 'Enter your email address.';
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return 'Enter a valid email address.';
  }

  return null;
}

export function validatePasswordStrength(password: string) {
  if (!password) {
    return 'Enter your password.';
  }

  if (password.length < 8) {
    return 'Use at least 8 characters for your password.';
  }

  if (!/[a-z]/i.test(password)) {
    return 'Include at least one letter in your password.';
  }

  if (!/\d/.test(password)) {
    return 'Include at least one number in your password.';
  }

  return null;
}

export function validateLoginInput(input: EmailPasswordLoginInput) {
  return (
    validateEmailAddress(input.email) ||
    validatePasswordStrength(input.password)
  );
}

export function validateSignUpInput(input: EmailPasswordSignUpInput) {
  return (
    validateEmailAddress(input.email) ||
    validatePasswordStrength(input.password) ||
    (!input.passwordConfirmation
      ? 'Confirm your password.'
      : input.password !== input.passwordConfirmation
        ? 'Passwords do not match.'
        : null)
  );
}
