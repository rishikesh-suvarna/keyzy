'use client'

import { useEffect, useState } from 'react';
import { useVault } from '@/lib/vault';
import { useAuth } from '@/lib/auth';
import { Shield, Lock, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

// Defined at module scope (not inside VaultGate's render) so its component
// identity is stable across renders — otherwise React would remount the inputs
// on every keystroke and focus would jump.
function Shell({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-black rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
        {children}
        <button
          onClick={onSignOut}
          className="mt-6 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// VaultGate sits between authentication and the vault UI. It loads the user's
// key material and forces them to either create a master password (first time)
// or unlock with it (every session) before any encrypted data is shown.
// Children only render once the in-memory DEK is available.
export default function VaultGate({ children }: { children: React.ReactNode }) {
  const { status, hint, refresh, setupVault, unlock } = useVault();
  const { logout } = useAuth();

  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hintText, setHintText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh().catch(() => toast.error('Failed to load your vault'));
  }, [refresh]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword.length < 8) {
      toast.error('Master password must be at least 8 characters');
      return;
    }
    if (masterPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await setupVault(masterPassword, hintText);
      setMasterPassword('');
      setConfirmPassword('');
      toast.success('Master password set. Your vault is ready.');
    } catch {
      toast.error('Failed to set up your vault');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await unlock(masterPassword);
      setMasterPassword('');
    } catch {
      toast.error('Incorrect master password');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'unlocked') {
    return <>{children}</>;
  }

  const inputClass =
    'block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors';
  const primaryBtn =
    'w-full flex items-center justify-center px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black dark:border-white border-t-transparent"></div>
      </div>
    );
  }

  if (status === 'uninitialized') {
    return (
      <Shell onSignOut={logout}>
        <div className="text-center mb-6">
          <div className="h-14 w-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-7 w-7 text-white dark:text-black" />
          </div>
          <h2 className="text-2xl font-bold text-black dark:text-white">Create your master password</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            This encrypts your vault on your device. We never see it — and if you forget it,
            your data <strong>cannot be recovered</strong>.
          </p>
        </div>
        <form onSubmit={handleSetup} className="space-y-4">
          <input
            type="password"
            autoFocus
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="Master password (min 8 characters)"
            className={inputClass}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm master password"
            className={inputClass}
          />
          <input
            type="text"
            value={hintText}
            onChange={(e) => setHintText(e.target.value)}
            placeholder="Optional hint (stored unencrypted)"
            className={inputClass}
          />
          <button type="submit" disabled={busy} className={primaryBtn}>
            <KeyRound className="h-4 w-4 mr-2" />
            {busy ? 'Setting up…' : 'Create vault'}
          </button>
        </form>
      </Shell>
    );
  }

  // status === 'locked'
  return (
    <Shell onSignOut={logout}>
      <div className="text-center mb-6">
        <div className="h-14 w-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mx-auto mb-4">
          <Lock className="h-7 w-7 text-white dark:text-black" />
        </div>
        <h2 className="text-2xl font-bold text-black dark:text-white">Unlock your vault</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Enter your master password to decrypt your passwords.
        </p>
        {hint && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Hint: {hint}</p>
        )}
      </div>
      <form onSubmit={handleUnlock} className="space-y-4">
        <input
          type="password"
          autoFocus
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          placeholder="Master password"
          className={inputClass}
        />
        <button type="submit" disabled={busy} className={primaryBtn}>
          <Lock className="h-4 w-4 mr-2" />
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </Shell>
  );
}
