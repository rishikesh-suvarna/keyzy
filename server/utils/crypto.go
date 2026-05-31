package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"strings"
)

type CryptoService struct {
	key []byte
}

// NewCryptoService builds an AES-256 crypto service from the configured key.
// The key must decode to exactly 32 bytes. Accepted forms:
//   - 32 raw characters (e.g. a 32-char passphrase)
//   - base64 encoding of 32 bytes
//   - hex encoding of 32 bytes
//
// A malformed or weak key is rejected outright — it is never padded or
// truncated, because doing so silently destroys the key's entropy.
func NewCryptoService(key string) (*CryptoService, error) {
	decoded, err := decodeKey(key)
	if err != nil {
		return nil, err
	}
	return &CryptoService{key: decoded}, nil
}

func decodeKey(key string) ([]byte, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, fmt.Errorf("ENCRYPTION_KEY is not set")
	}
	if b, err := base64.StdEncoding.DecodeString(key); err == nil && len(b) == 32 {
		return b, nil
	}
	if b, err := hex.DecodeString(key); err == nil && len(b) == 32 {
		return b, nil
	}
	if len(key) == 32 {
		return []byte(key), nil
	}
	return nil, fmt.Errorf("ENCRYPTION_KEY must be 32 bytes (a 32-character string, or the base64/hex encoding of 32 bytes); got %d characters", len(key))
}

func (c *CryptoService) Encrypt(plaintext string) (string, error) {
	// Create AES cipher
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	// Create random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt the data
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Encode to base64
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (c *CryptoService) Decrypt(ciphertext string) (string, error) {
	// Decode from base64
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// Create AES cipher
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	// Extract nonce
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, encryptedData := data[:nonceSize], data[nonceSize:]

	// Decrypt the data
	plaintext, err := gcm.Open(nil, nonce, encryptedData, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}
