// Zero-knowledge crypto for Keyzy.
//
// Everything here runs in the browser. The server never sees the master
// password, any derived key, the Data Encryption Key (DEK), or any plaintext.
//
// Key hierarchy (Bitwarden-style):
//   masterKey = Argon2id(masterPassword, salt)            // 32 bytes
//   wrapKey   = HKDF-SHA256(masterKey, "keyzy-vault-wrap-key")  // AES-GCM key
//   DEK       = random 32 bytes                            // wraps all entries
//   wrappedDEK = AES-256-GCM(wrapKey, DEK)                 // stored server-side
//
// Each value is stored as a versioned envelope: `v1:<b64url nonce>:<b64url ct>`.

import { argon2id } from 'hash-wasm';

// --- versioned parameters --------------------------------------------------

export const ENVELOPE_VERSION = 'v1';

// Argon2id parameters. Tuned for a browser: ~64 MiB, 3 passes. Bump these
// (and the version) over time as hardware improves.
const ARGON2_MEMORY_KIB = 64 * 1024; // 64 MiB
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 1;
const KEY_LENGTH = 32; // 256-bit keys

const SALT_BYTES = 16;
const NONCE_BYTES = 12; // AES-GCM standard nonce size

const HKDF_INFO = 'keyzy-vault-wrap-key';

// --- encoding helpers ------------------------------------------------------

export function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

export function generateSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const encodeSalt = toBase64Url;
export const decodeSalt = fromBase64Url;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// --- key derivation --------------------------------------------------------

// Derive the 32-byte master key from the master password and salt via Argon2id.
async function deriveMasterKey(masterPassword: string, salt: Uint8Array): Promise<Uint8Array> {
  const hash = await argon2id({
    password: masterPassword,
    salt,
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY_KIB,
    hashLength: KEY_LENGTH,
    outputType: 'binary',
  });
  return hash;
}

// Expand the master key into an AES-GCM "wrap key" via HKDF-SHA256. The extra
// HKDF step gives domain separation between the raw KDF output and the key that
// actually wraps the DEK.
async function deriveWrapKey(masterKey: Uint8Array): Promise<CryptoKey> {
  const hkdfBase = await crypto.subtle.importKey('raw', masterKey as BufferSource, 'HKDF', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: textEncoder.encode(HKDF_INFO),
    },
    hkdfBase,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// Derive the wrap key directly from a master password + salt.
export async function deriveWrapKeyFromPassword(
  masterPassword: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const masterKey = await deriveMasterKey(masterPassword, salt);
  return deriveWrapKey(masterKey);
}

// --- DEK (Data Encryption Key) ---------------------------------------------

// Generate a fresh, extractable DEK. It is extractable only so it can be wrapped
// for storage; it is never persisted in the clear.
export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

// Wrap (encrypt) the DEK under the wrap key, returning a v1 envelope string.
export async function wrapDEK(dek: CryptoKey, wrapKey: CryptoKey): Promise<string> {
  const rawDek = new Uint8Array(await crypto.subtle.exportKey('raw', dek));
  return encryptBytes(rawDek, wrapKey);
}

// Unwrap the DEK from its envelope. Throws if the master password is wrong
// (the AES-GCM authentication tag fails to verify).
export async function unwrapDEK(envelope: string, wrapKey: CryptoKey): Promise<CryptoKey> {
  const rawDek = await decryptBytes(envelope, wrapKey);
  return crypto.subtle.importKey('raw', rawDek as BufferSource, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

// --- field encryption ------------------------------------------------------

async function encryptBytes(plaintext: Uint8Array, key: CryptoKey): Promise<string> {
  const nonce = randomBytes(NONCE_BYTES);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, key, plaintext as BufferSource),
  );
  return `${ENVELOPE_VERSION}:${toBase64Url(nonce)}:${toBase64Url(ciphertext)}`;
}

async function decryptBytes(envelope: string, key: CryptoKey): Promise<Uint8Array> {
  const parts = envelope.split(':');
  if (parts.length !== 3 || parts[0] !== ENVELOPE_VERSION) {
    throw new Error('Unrecognized ciphertext envelope');
  }
  const nonce = fromBase64Url(parts[1]);
  const ciphertext = fromBase64Url(parts[2]);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new Uint8Array(plaintext);
}

// Encrypt a UTF-8 string field with the DEK, returning a v1 envelope.
export async function encryptField(plaintext: string, dek: CryptoKey): Promise<string> {
  return encryptBytes(textEncoder.encode(plaintext), dek);
}

// Decrypt a v1 envelope back to its UTF-8 string.
export async function decryptField(envelope: string, dek: CryptoKey): Promise<string> {
  return textDecoder.decode(await decryptBytes(envelope, dek));
}

// --- secure password generation --------------------------------------------

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const SIMILAR = 'il1Lo0O';

export interface GenerateOptions {
  length: number;
  includeUpper: boolean;
  includeLower: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
}

// Uniform random index in [0, max) using rejection sampling — no modulo bias.
function secureRandomIndex(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

// Cryptographically secure password generator (replaces Math.random()).
export function generatePassword(opts: GenerateOptions): string {
  let charset = '';
  if (opts.includeUpper) charset += UPPERCASE;
  if (opts.includeLower) charset += LOWERCASE;
  if (opts.includeNumbers) charset += NUMBERS;
  if (opts.includeSymbols) charset += SYMBOLS;
  if (charset === '') charset = UPPERCASE + LOWERCASE + NUMBERS;

  if (opts.excludeSimilar) {
    charset = charset
      .split('')
      .filter((c) => !SIMILAR.includes(c))
      .join('');
  }

  const length = Math.max(1, Math.min(128, opts.length || 16));
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[secureRandomIndex(charset.length)];
  }
  return password;
}
