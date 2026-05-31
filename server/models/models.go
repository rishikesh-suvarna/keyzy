package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID          uuid.UUID `json:"id"`
	FirebaseUID string    `json:"firebase_uid"`
	Email       string    `json:"email"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PasswordEntry holds only client-side ciphertext. The server never sees or
// stores any plaintext credential. service_name is kept as a plaintext label
// for listing/search; everything sensitive is an opaque "v1:..." envelope
// produced and consumed by the browser.
type PasswordEntry struct {
	ID                uuid.UUID `json:"id"`
	UserID            uuid.UUID `json:"user_id"`
	ServiceName       string    `json:"service_name"`
	EncryptedPassword string    `json:"encrypted_password"`
	EncryptedUsername *string   `json:"encrypted_username,omitempty"`
	EncryptedURL      *string   `json:"encrypted_url,omitempty"`
	EncryptedNotes    *string   `json:"encrypted_notes,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type CreatePasswordRequest struct {
	ServiceName       string  `json:"service_name" validate:"required,min=1,max=255"`
	EncryptedPassword string  `json:"encrypted_password" validate:"required,min=1"`
	EncryptedUsername *string `json:"encrypted_username,omitempty"`
	EncryptedURL      *string `json:"encrypted_url,omitempty"`
	EncryptedNotes    *string `json:"encrypted_notes,omitempty"`
}

type UpdatePasswordRequest struct {
	ServiceName       string  `json:"service_name,omitempty" validate:"omitempty,min=1,max=255"`
	EncryptedPassword string  `json:"encrypted_password,omitempty"`
	EncryptedUsername *string `json:"encrypted_username,omitempty"`
	EncryptedURL      *string `json:"encrypted_url,omitempty"`
	EncryptedNotes    *string `json:"encrypted_notes,omitempty"`
}

// VaultInfo describes a user's zero-knowledge key material. All values are
// non-secret (the salt) or already encrypted (the wrapped vault key); they are
// useless without the user's master password.
type VaultInfo struct {
	Initialized        bool    `json:"initialized"`
	KDFSalt            *string `json:"kdf_salt,omitempty"`
	WrappedVaultKey    *string `json:"wrapped_vault_key,omitempty"`
	MasterPasswordHint *string `json:"master_password_hint,omitempty"`
}

type SetupVaultRequest struct {
	KDFSalt            string  `json:"kdf_salt" validate:"required"`
	WrappedVaultKey    string  `json:"wrapped_vault_key" validate:"required"`
	MasterPasswordHint *string `json:"master_password_hint,omitempty"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
