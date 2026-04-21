import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'financeassistant.authToken';

let onboardingAuthToken = '';
let isAuthSessionHydrated = false;
let hasPersistentAuthToken = false;

async function persistAuthToken(token: string) {
  if (token) {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function hydrateAuthSession() {
  if (isAuthSessionHydrated) {
    return onboardingAuthToken;
  }

  try {
    onboardingAuthToken = (await SecureStore.getItemAsync(AUTH_TOKEN_KEY)) ?? '';
    hasPersistentAuthToken = Boolean(onboardingAuthToken);
  } catch (error) {
    console.warn('Unable to hydrate auth session.', error);
    onboardingAuthToken = '';
    hasPersistentAuthToken = false;
  } finally {
    isAuthSessionHydrated = true;
  }

  return onboardingAuthToken;
}

export function hasHydratedAuthSession() {
  return isAuthSessionHydrated;
}

export function hasPersistentAuthSession() {
  return hasPersistentAuthToken;
}

export function setOnboardingAuthToken(token: string) {
  onboardingAuthToken = token;
  isAuthSessionHydrated = true;
}

export async function setPersistentAuthToken(token: string) {
  onboardingAuthToken = token;
  isAuthSessionHydrated = true;
  hasPersistentAuthToken = Boolean(token);

  try {
    await persistAuthToken(token);
  } catch (error) {
    console.warn('Unable to persist auth session.', error);
  }
}

export function getOnboardingAuthToken() {
  return onboardingAuthToken;
}

export async function clearOnboardingAuthToken() {
  onboardingAuthToken = '';
  isAuthSessionHydrated = true;
  hasPersistentAuthToken = false;

  try {
    await persistAuthToken('');
  } catch (error) {
    console.warn('Unable to clear auth session.', error);
  }
}
