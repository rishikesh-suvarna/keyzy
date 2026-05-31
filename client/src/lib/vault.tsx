'use client'

import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useAuth } from './auth';
import {
  vaultApi,
  PasswordEntry,
  CreatePasswordRequest,
  UpdatePasswordRequest,
} from './api';
import {
  deriveWrapKeyFromPassword,
  generateDEK,
  wrapDEK,
  unwrapDEK,
  generateSalt,
  encodeSalt,
  decodeSalt,
  encryptField,
  decryptField,
} from './crypto';

// Vault lifecycle:
//   loading       -> fetching key material from the server
//   uninitialized -> user has never set a master password (show setup)
//   locked         -> key material exists, DEK not in memory (show unlock)
//   unlocked       -> DEK is in memory, vault is usable
export type VaultStatus = 'loading' | 'uninitialized' | 'locked' | 'unlocked';

// A fully decrypted entry for use in the UI. Plaintext lives only here, in
// memory, after on-demand decryption.
export interface DecryptedEntry {
  id: string;
  user_id: string;
  service_name: string;
  password: string;
  username?: string;
  service_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Plaintext input from the UI before encryption.
export interface PlainEntryInput {
  service_name: string;
  password?: string;
  username?: string;
  service_url?: string;
  notes?: string;
}

interface VaultContextType {
  status: VaultStatus;
  hint: string | null;
  refresh: () => Promise<void>;
  setupVault: (masterPassword: string, hint?: string) => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  lock: () => void;
  decryptEntry: (entry: PasswordEntry) => Promise<DecryptedEntry>;
  encryptForCreate: (input: PlainEntryInput) => Promise<CreatePasswordRequest>;
  encryptForUpdate: (input: PlainEntryInput) => Promise<UpdatePasswordRequest>;
}

const VaultContext = createContext<VaultContextType>({} as VaultContextType);

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { getIdToken } = useAuth();

  const [status, setStatus] = useState<VaultStatus>('loading');
  const [hint, setHint] = useState<string | null>(null);

  // Key material (non-secret salt + already-encrypted wrapped key) from the server.
  const saltB64 = useRef<string | null>(null);
  const wrappedKey = useRef<string | null>(null);
  // The unwrapped DEK. In memory only — never persisted.
  const dek = useRef<CryptoKey | null>(null);

  const requireToken = useCallback(async (): Promise<string> => {
    const token = await getIdToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }, [getIdToken]);

  // Load the user's key material and decide whether to show setup vs unlock.
  const refresh = useCallback(async () => {
    setStatus('loading');
    const token = await requireToken();
    const info = await vaultApi.getVault(token);
    setHint(info.master_password_hint ?? null);

    if (!info.initialized || !info.kdf_salt || !info.wrapped_vault_key) {
      saltB64.current = null;
      wrappedKey.current = null;
      setStatus('uninitialized');
      return;
    }

    saltB64.current = info.kdf_salt;
    wrappedKey.current = info.wrapped_vault_key;
    // Don't auto-unlock — require the master password each session.
    setStatus('locked');
  }, [requireToken]);

  // First-time setup: create a DEK, wrap it under a new master password, persist.
  const setupVault = useCallback(
    async (masterPassword: string, hintText?: string) => {
      const token = await requireToken();
      const salt = generateSalt();
      const wrapKey = await deriveWrapKeyFromPassword(masterPassword, salt);
      const newDek = await generateDEK();
      const wrapped = await wrapDEK(newDek, wrapKey);

      await vaultApi.setupVault(
        {
          kdf_salt: encodeSalt(salt),
          wrapped_vault_key: wrapped,
          master_password_hint: hintText?.trim() ? hintText.trim() : undefined,
        },
        token,
      );

      saltB64.current = encodeSalt(salt);
      wrappedKey.current = wrapped;
      dek.current = newDek;
      setHint(hintText?.trim() ? hintText.trim() : null);
      setStatus('unlocked');
    },
    [requireToken],
  );

  // Unlock an existing vault by re-deriving the wrap key and unwrapping the DEK.
  // A wrong master password makes unwrap throw (GCM auth failure).
  const unlock = useCallback(async (masterPassword: string) => {
    if (!saltB64.current || !wrappedKey.current) {
      throw new Error('Vault is not initialized');
    }
    const wrapKey = await deriveWrapKeyFromPassword(masterPassword, decodeSalt(saltB64.current));
    const unwrapped = await unwrapDEK(wrappedKey.current, wrapKey);
    dek.current = unwrapped;
    setStatus('unlocked');
  }, []);

  const lock = useCallback(() => {
    dek.current = null;
    setStatus('locked');
  }, []);

  const requireDEK = (): CryptoKey => {
    if (!dek.current) throw new Error('Vault is locked');
    return dek.current;
  };

  const decryptEntry = useCallback(async (entry: PasswordEntry): Promise<DecryptedEntry> => {
    const key = requireDEK();
    return {
      id: entry.id,
      user_id: entry.user_id,
      service_name: entry.service_name,
      password: await decryptField(entry.encrypted_password, key),
      username: entry.encrypted_username
        ? await decryptField(entry.encrypted_username, key)
        : undefined,
      service_url: entry.encrypted_url
        ? await decryptField(entry.encrypted_url, key)
        : undefined,
      notes: entry.encrypted_notes ? await decryptField(entry.encrypted_notes, key) : undefined,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    };
  }, []);

  const encryptForCreate = useCallback(
    async (input: PlainEntryInput): Promise<CreatePasswordRequest> => {
      const key = requireDEK();
      return {
        service_name: input.service_name,
        encrypted_password: await encryptField(input.password ?? '', key),
        encrypted_username: input.username
          ? await encryptField(input.username, key)
          : undefined,
        encrypted_url: input.service_url ? await encryptField(input.service_url, key) : undefined,
        encrypted_notes: input.notes ? await encryptField(input.notes, key) : undefined,
      };
    },
    [],
  );

  const encryptForUpdate = useCallback(
    async (input: PlainEntryInput): Promise<UpdatePasswordRequest> => {
      const key = requireDEK();
      const out: UpdatePasswordRequest = { service_name: input.service_name };
      if (input.password) out.encrypted_password = await encryptField(input.password, key);
      // Encrypt optional fields even when cleared so updates can blank them out.
      out.encrypted_username = input.username ? await encryptField(input.username, key) : '';
      out.encrypted_url = input.service_url ? await encryptField(input.service_url, key) : '';
      out.encrypted_notes = input.notes ? await encryptField(input.notes, key) : '';
      return out;
    },
    [],
  );

  const value: VaultContextType = {
    status,
    hint,
    refresh,
    setupVault,
    unlock,
    lock,
    decryptEntry,
    encryptForCreate,
    encryptForUpdate,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
};
