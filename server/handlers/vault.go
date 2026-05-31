package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"password-manager/middleware"
	"password-manager/models"
)

type VaultHandler struct {
	db *sql.DB
}

func NewVaultHandler(db *sql.DB) *VaultHandler {
	return &VaultHandler{db: db}
}

// GetVault returns the user's zero-knowledge key material: the KDF salt and the
// wrapped (encrypted) vault key. Both are useless without the master password,
// which the server never sees. If the user has not set a master password yet,
// Initialized is false and the key fields are null.
func (h *VaultHandler) GetVault(w http.ResponseWriter, r *http.Request) {
	firebaseUID := middleware.GetFirebaseUID(r)
	if firebaseUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var salt, wrappedKey, hint sql.NullString
	err := h.db.QueryRow(`
		SELECT kdf_salt, wrapped_vault_key, master_password_hint
		FROM users WHERE firebase_uid = $1
	`, firebaseUID).Scan(&salt, &wrappedKey, &hint)

	if err == sql.ErrNoRows {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	info := models.VaultInfo{
		Initialized: salt.Valid && wrappedKey.Valid,
	}
	if salt.Valid {
		info.KDFSalt = &salt.String
	}
	if wrappedKey.Valid {
		info.WrappedVaultKey = &wrappedKey.String
	}
	if hint.Valid {
		info.MasterPasswordHint = &hint.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Vault info retrieved successfully",
		Data:    info,
	})
}

// SetupVault stores the user's key material the first time they set a master
// password. It refuses to overwrite an already-initialized vault — changing the
// master password (re-wrapping the key) is a separate, dedicated flow so a bug
// or replayed request can never silently lock a user out of their data.
func (h *VaultHandler) SetupVault(w http.ResponseWriter, r *http.Request) {
	firebaseUID := middleware.GetFirebaseUID(r)
	if firebaseUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.SetupVaultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.KDFSalt == "" || req.WrappedVaultKey == "" {
		http.Error(w, "kdf_salt and wrapped_vault_key are required", http.StatusBadRequest)
		return
	}

	// Only set the key material if it has not been set already.
	result, err := h.db.Exec(`
		UPDATE users
		SET kdf_salt = $1, wrapped_vault_key = $2, master_password_hint = $3, updated_at = NOW()
		WHERE firebase_uid = $4 AND kdf_salt IS NULL AND wrapped_vault_key IS NULL
	`, req.KDFSalt, req.WrappedVaultKey, req.MasterPasswordHint, firebaseUID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if rowsAffected == 0 {
		// Either the user doesn't exist or the vault is already initialized.
		http.Error(w, "Vault already initialized", http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Vault initialized successfully",
	})
}
