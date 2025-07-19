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

type PasswordEntry struct {
	ID                uuid.UUID `json:"id"`
	UserID            uuid.UUID `json:"user_id"`
	ServiceName       string    `json:"service_name"`
	ServiceURL        *string   `json:"service_url,omitempty"`
	Username          *string   `json:"username,omitempty"`
	EncryptedPassword string    `json:"-"`                  // Never send encrypted password to client
	Password          string    `json:"password,omitempty"` // Only for responses after decryption
	Notes             *string   `json:"notes,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type CreatePasswordRequest struct {
	ServiceName string  `json:"service_name" validate:"required,min=1,max=255"`
	ServiceURL  *string `json:"service_url,omitempty" validate:"omitempty,url,max=500"`
	Username    *string `json:"username,omitempty" validate:"omitempty,max=255"`
	Password    string  `json:"password" validate:"required,min=1"`
	Notes       *string `json:"notes,omitempty"`
}

type UpdatePasswordRequest struct {
	ServiceName string  `json:"service_name,omitempty" validate:"omitempty,min=1,max=255"`
	ServiceURL  *string `json:"service_url,omitempty" validate:"omitempty,url,max=500"`
	Username    *string `json:"username,omitempty" validate:"omitempty,max=255"`
	Password    string  `json:"password,omitempty" validate:"omitempty,min=1"`
	Notes       *string `json:"notes,omitempty"`
}

type GeneratePasswordRequest struct {
	Length         int  `json:"length" validate:"min=8,max=128"`
	IncludeUpper   bool `json:"include_upper"`
	IncludeLower   bool `json:"include_lower"`
	IncludeNumbers bool `json:"include_numbers"`
	IncludeSymbols bool `json:"include_symbols"`
	ExcludeSimilar bool `json:"exclude_similar"`
}

type GeneratePasswordResponse struct {
	Password string `json:"password"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
