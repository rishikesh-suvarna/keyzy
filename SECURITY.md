# Keyzy Security Model

Keyzy is a **zero-knowledge** password manager: your passwords are encrypted and
decrypted entirely in your browser, using a key derived from a master password
that never leaves your device. The server only ever stores ciphertext — it
cannot read your credentials, and there is no server-side key that could.

This document explains exactly how passwords are stored, encrypted, and
decrypted. For the broader hardening plan see [ROADMAP.md](ROADMAP.md).

---

## The three keys

Encryption uses a deliberate key hierarchy. Two keys are *derived* from your
master password; one is *random*. Your master password never directly encrypts
your data — it encrypts a key, and that key encrypts your data.

| Key | What it is | Where it lives |
| --- | --- | --- |
| **Master key → Wrap key** | Derived from your master password (Argon2id → HKDF) | Recomputed on each unlock, never stored |
| **DEK** (Data Encryption Key) | A random 32-byte AES-256-GCM key that encrypts your entries | In browser memory while unlocked; on the server only in *wrapped* (encrypted) form |
| **Firebase ID token** | Authentication only — proves *who* you are | Unrelated to encryption |

The indirection (master password → wrap key → DEK → data) means the master
password can later be changed by re-wrapping the DEK, without re-encrypting every
entry.

Relevant code: [`client/src/lib/crypto.ts`](client/src/lib/crypto.ts),
[`client/src/lib/vault.tsx`](client/src/lib/vault.tsx).

## Cryptographic parameters (`v1`)

- **Key derivation:** Argon2id — 64 MiB memory, 3 iterations, parallelism 1, 32-byte output (via `hash-wasm`).
- **Key separation:** HKDF-SHA256 expands the master key into the AES-GCM wrap key (`info = "keyzy-vault-wrap-key"`).
- **Encryption:** AES-256-GCM (authenticated) with a fresh random 12-byte nonce per encryption.
- **Salt:** 16 random bytes per user, stored server-side (a salt is not secret).
- **Envelope format:** `v1:<base64url(nonce)>:<base64url(ciphertext+tag)>`. The `v1` prefix lets parameters evolve without breaking old data.

---

## Lifecycle

### 1. Setting the master password (one time)

Runs entirely in the browser (`setupVault`):

```
salt       = 16 random bytes
masterKey  = Argon2id(masterPassword, salt)                  // 32 bytes
wrapKey    = HKDF-SHA256(masterKey, "keyzy-vault-wrap-key")  // AES-GCM key
DEK        = random AES-256-GCM key
wrappedDEK = AES-256-GCM(wrapKey, DEK)                        // the DEK, encrypted
```

Only `salt` and `wrappedDEK` are sent to the server (`POST /api/vault`) and
stored on the user row:

- `kdf_salt` — not secret
- `wrapped_vault_key` — the DEK, encrypted; useless without the master password
- `master_password_hint` — optional, plaintext

**Never leaves the browser:** the master password, master key, wrap key, or raw DEK.

### 2. Encrypting an entry (every save)

Each sensitive field is encrypted with the in-memory DEK (`encryptField`):

```
nonce      = 12 random bytes                    // fresh per field, per save
ciphertext = AES-256-GCM(DEK, nonce, plaintext)
envelope   = "v1:" + base64url(nonce) + ":" + base64url(ciphertext)
```

A fresh nonce each time means encrypting the same password twice yields different
ciphertext. Only these envelopes are sent to `POST /api/passwords`.

### 3. What the database stores

The server persists the strings verbatim and never decrypts. Example
`password_entries` row:

| column | value |
| --- | --- |
| `service_name` | `GitHub` *(plaintext label, for listing/search)* |
| `encrypted_password` | `v1:9Qx2…:t7Kp4f…` |
| `encrypted_username` | `v1:Lm0a…:Bz91…` |
| `encrypted_url` | `v1:Pp7…:Q2c…` |
| `encrypted_notes` | `null` |

A database dump yields service names and opaque envelopes — no credentials, and
no key to open them.

### 4. Unlocking (start of each session)

On refresh the DEK is gone from memory, so the vault is **locked**. On entering
the master password (`unlock`):

```
wrapKey = HKDF(Argon2id(masterPassword, kdf_salt))    // same inputs → same key
DEK     = AES-256-GCM-decrypt(wrapKey, wrapped_vault_key)
```

The DEK is held in memory only (a React `useRef`), never written to disk or
`localStorage`, until you lock or refresh.

**Wrong-password detection:** AES-GCM is authenticated. A wrong master password
produces a wrong wrap key, so unwrapping the DEK fails its authentication tag and
throws. No password hash is stored or compared — the cryptography itself rejects
an incorrect password.

### 5. Decrypting for display

After unlock, the dashboard fetches the envelopes and decrypts each field with
the in-memory DEK (`decryptField`): split the `v1:` envelope, base64url-decode
the nonce and ciphertext, and AES-GCM-decrypt. Plaintext exists only transiently
in memory, while you view or copy it.

---

## What the server can and cannot see

**Can see:** your email/UID (Firebase auth), `service_name` labels, the
non-secret `kdf_salt`, and encrypted blobs (`wrapped_vault_key`, field envelopes).

**Cannot see:** your master password, any derived key, the DEK, or any credential
plaintext. There is no server-side encryption key.

```
master password ─Argon2id(salt)→ master key ─HKDF→ wrap key
                                                      │
                              wraps / unwraps         ▼
   wrapped_vault_key  ◀──────────────────────────  DEK (random)
   (stored on server)                                 │
                                       encrypts / decrypts each field
                                                       ▼
                          v1:nonce:ciphertext  (stored on server)
```

## Known limitations / trade-offs

- **No recovery.** If you forget your master password, your vault is
  unrecoverable — there is no key on the server to fall back to. v1 ships only an
  optional hint. A recovery-key / emergency-kit flow is a planned follow-up.
- **`service_name` is stored in plaintext** as a searchable label; the server can
  see which services you have entries for (never the credentials). Encrypting it
  is a possible future enhancement.
- **No master-password change flow yet** (would re-wrap the DEK), and **no
  inactivity auto-lock timer** yet. Both are tracked in [ROADMAP.md](ROADMAP.md).

## Reporting

Found a security issue? Please open a private report rather than a public issue.
