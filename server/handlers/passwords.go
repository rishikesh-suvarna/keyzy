package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"

	"password-manager/middleware"
	"password-manager/models"
	"password-manager/utils"
)

type PasswordHandler struct {
	db            *sql.DB
	cryptoService *utils.CryptoService
	generator     *utils.PasswordGenerator
}

func NewPasswordHandler(db *sql.DB, encryptionKey string) *PasswordHandler {
	cryptoService, err := utils.NewCryptoService(encryptionKey)
	if err != nil {
		panic("Failed to initialize crypto service: " + err.Error())
	}

	return &PasswordHandler{
		db:            db,
		cryptoService: cryptoService,
		generator:     utils.NewPasswordGenerator(),
	}
}

// GetPasswords returns all password entries for the authenticated user
func (h *PasswordHandler) GetPasswords(w http.ResponseWriter, r *http.Request) {
	firebaseUID := middleware.GetFirebaseUID(r)
	if firebaseUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get user ID from firebase UID
	userID, err := h.getUserID(firebaseUID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	rows, err := h.db.Query(`
		SELECT id, user_id, service_name, service_url, username, encrypted_password, notes, created_at, updated_at
		FROM password_entries 
		WHERE user_id = $1 
		ORDER BY created_at ASC
	`, userID)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var passwords []models.PasswordEntry
	for rows.Next() {
		var entry models.PasswordEntry
		err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&entry.ServiceName,
			&entry.ServiceURL,
			&entry.Username,
			&entry.EncryptedPassword,
			&entry.Notes,
			&entry.CreatedAt,
			&entry.UpdatedAt,
		)
		if err != nil {
			continue
		}

		// Decrypt password
		if decrypted, err := h.cryptoService.Decrypt(entry.EncryptedPassword); err == nil {
			entry.Password = decrypted
		}
		entry.EncryptedPassword = "" // Don't send encrypted version

		passwords = append(passwords, entry)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Passwords retrieved successfully",
		Data:    passwords,
	})
}

// GetPassword returns a single password entry
func (h *PasswordHandler) GetPassword(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	passwordID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid password ID", http.StatusBadRequest)
		return
	}

	firebaseUID := middleware.GetFirebaseUID(r)
	if firebaseUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := h.getUserID(firebaseUID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var entry models.PasswordEntry
	err = h.db.QueryRow(`
		SELECT id, user_id, service_name, service_url, username, encrypted_password, notes, created_at, updated_at
		FROM password_entries 
		WHERE id = $1 AND user_id = $2
	`, passwordID, userID).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.ServiceName,
		&entry.ServiceURL,
		&entry.Username,
		&entry.EncryptedPassword,
		&entry.Notes,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Password not found", http.StatusNotFound)
		return
	}

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Decrypt password
	if decrypted, err := h.cryptoService.Decrypt(entry.EncryptedPassword); err == nil {
		entry.Password = decrypted
	}
	entry.EncryptedPassword = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Password retrieved successfully",
		Data:    entry,
	})
}

// CreatePassword creates a new password entry
func (h *PasswordHandler) CreatePassword(w http.ResponseWriter, r *http.Request) {
	firebaseUID := middleware.GetFirebaseUID(r)
	if firebaseUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := h.getUserID(firebaseUID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var req models.CreatePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.ServiceName == "" || req.Password == "" {
		http.Error(w, "Service name and password are required", http.StatusBadRequest)
		return
	}

	// Encrypt password
	encryptedPassword, err := h.cryptoService.Encrypt(req.Password)
	if err != nil {
		http.Error(w, "Failed to encrypt password", http.StatusInternalServerError)
		return
	}

	var entry models.PasswordEntry
	err = h.db.QueryRow(`
		INSERT INTO password_entries (user_id, service_name, service_url, username, encrypted_password, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, service_name, service_url, username, encrypted_password, notes, created_at, updated_at
	`, userID, req.ServiceName, req.ServiceURL, req.Username, encryptedPassword, req.Notes).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.ServiceName,
		&entry.ServiceURL,
		&entry.Username,
		&entry.EncryptedPassword,
		&entry.Notes,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to create password entry", http.StatusInternalServerError)
		return
	}

	// Return decrypted password in response
	entry.Password = req.Password
	entry.EncryptedPassword = ""

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Password created successfully",
		Data:    entry,
	})
}

// UpdatePassword updates an existing password entry
func (h *PasswordHandler) UpdatePassword(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	passwordID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid password ID", http.StatusBadRequest)
		return
	}

	firebaseUID := middleware.GetFirebaseUID(r)
	if firebaseUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := h.getUserID(firebaseUID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var req models.UpdatePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if password entry exists and belongs to user
	var exists bool
	err = h.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM password_entries WHERE id = $1 AND user_id = $2)
	`, passwordID, userID).Scan(&exists)

	if err != nil || !exists {
		http.Error(w, "Password not found", http.StatusNotFound)
		return
	}

	// Build dynamic update query
	updateFields := []string{}
	args := []interface{}{}
	argCount := 1

	if req.ServiceName != "" {
		updateFields = append(updateFields, "service_name = $"+strconv.Itoa(argCount))
		args = append(args, req.ServiceName)
		argCount++
	}

	if req.ServiceURL != nil {
		updateFields = append(updateFields, "service_url = $"+strconv.Itoa(argCount))
		args = append(args, req.ServiceURL)
		argCount++
	}

	if req.Username != nil {
		updateFields = append(updateFields, "username = $"+strconv.Itoa(argCount))
		args = append(args, req.Username)
		argCount++
	}

	if req.Password != "" {
		encryptedPassword, err := h.cryptoService.Encrypt(req.Password)
		if err != nil {
			http.Error(w, "Failed to encrypt password", http.StatusInternalServerError)
			return
		}
		updateFields = append(updateFields, "encrypted_password = $"+strconv.Itoa(argCount))
		args = append(args, encryptedPassword)
		argCount++
	}

	if req.Notes != nil {
		updateFields = append(updateFields, "notes = $"+strconv.Itoa(argCount))
		args = append(args, req.Notes)
		argCount++
	}

	if len(updateFields) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Add updated_at field
	updateFields = append(updateFields, "updated_at = NOW()")

	// Add WHERE clause parameters
	args = append(args, passwordID, userID)

	query := `
		UPDATE password_entries 
		SET ` + strings.Join(updateFields, ", ") + `
		WHERE id = $` + strconv.Itoa(argCount) + ` AND user_id = $` + strconv.Itoa(argCount+1) + `
		RETURNING id, user_id, service_name, service_url, username, encrypted_password, notes, created_at, updated_at
	`

	var entry models.PasswordEntry
	err = h.db.QueryRow(query, args...).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.ServiceName,
		&entry.ServiceURL,
		&entry.Username,
		&entry.EncryptedPassword,
		&entry.Notes,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to update password entry", http.StatusInternalServerError)
		return
	}

	// Decrypt password for response
	if decrypted, err := h.cryptoService.Decrypt(entry.EncryptedPassword); err == nil {
		entry.Password = decrypted
	}
	entry.EncryptedPassword = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Password updated successfully",
		Data:    entry,
	})
}

// DeletePassword deletes a password entry
func (h *PasswordHandler) DeletePassword(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	passwordID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid password ID", http.StatusBadRequest)
		return
	}

	firebaseUID := middleware.GetFirebaseUID(r)
	if firebaseUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := h.getUserID(firebaseUID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	result, err := h.db.Exec(`
		DELETE FROM password_entries 
		WHERE id = $1 AND user_id = $2
	`, passwordID, userID)

	if err != nil {
		http.Error(w, "Failed to delete password entry", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Password not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Password deleted successfully",
	})
}

// GeneratePassword generates a new password based on criteria
func (h *PasswordHandler) GeneratePassword(w http.ResponseWriter, r *http.Request) {
	var req models.GeneratePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set defaults if no options specified
	if req.Length == 0 {
		req.Length = 12
	}
	if !req.IncludeUpper && !req.IncludeLower && !req.IncludeNumbers && !req.IncludeSymbols {
		req.IncludeUpper = true
		req.IncludeLower = true
		req.IncludeNumbers = true
	}

	password, err := h.generator.Generate(
		req.Length,
		req.IncludeUpper,
		req.IncludeLower,
		req.IncludeNumbers,
		req.IncludeSymbols,
		req.ExcludeSimilar,
	)

	if err != nil {
		http.Error(w, "Failed to generate password", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Password generated successfully",
		Data:    models.GeneratePasswordResponse{Password: password},
	})
}

// Helper function to get user ID from Firebase UID
func (h *PasswordHandler) getUserID(firebaseUID string) (uuid.UUID, error) {
	var userID uuid.UUID
	err := h.db.QueryRow(`
		SELECT id FROM users WHERE firebase_uid = $1
	`, firebaseUID).Scan(&userID)
	return userID, err
}
