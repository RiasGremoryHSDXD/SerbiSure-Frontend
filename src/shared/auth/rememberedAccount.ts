import * as SecureStore from 'expo-secure-store';

export interface RememberedAccount {
  firstName: string;
  identifier: string;
}

const STORAGE_KEY = 'serbisure.remembered_account';

/**
 * Retrieves the last logged-in account details for fast "Welcome back" login.
 */
export async function getRememberedAccount(): Promise<RememberedAccount | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw);
    if (data && typeof data.firstName === 'string' && data.firstName.trim()) {
      const trimmedName = data.firstName.trim();
      const trimmedId = typeof data.identifier === 'string' ? data.identifier.trim() : '';
      if (trimmedName.toLowerCase() === 'daven' || trimmedId.toLowerCase() === 'daventheabyss@gmail.com') {
        void SecureStore.deleteItemAsync(STORAGE_KEY);
        return null;
      }
      return {
        firstName: trimmedName,
        identifier: trimmedId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves the account details for "Welcome back" upon login or logout.
 */
export async function setRememberedAccount(account: RememberedAccount): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(account));
  } catch {
    // Storage writes are non-blocking
  }
}

/**
 * Clears the remembered account (e.g. if user explicitly forgets account).
 */
export async function clearRememberedAccount(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // Storage writes are non-blocking
  }
}
