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
	db *sql.DB
}

func NewPasswordHandler(db *sql.DB) *PasswordHandler {
	return &PasswordHandler{db: db}
}

// GetPasswords returns all password entries for the authenticated user. Every
// credential field is returned exactly as stored — an opaque client-side
// ciphertext envelope. The server cannot read them.
func (h *PasswordHandler) GetPasswords(w http.ResponseWriter, r *http.Request) {
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

	rows, err := h.db.Query(`
		SELECT id, user_id, service_name, encrypted_password, encrypted_username, encrypted_url, encrypted_notes, created_at, updated_at
		FROM password_entries
		WHERE user_id = $1
		ORDER BY created_at ASC
	`, userID)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	passwords := []models.PasswordEntry{}
	for rows.Next() {
		var entry models.PasswordEntry
		if err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&entry.ServiceName,
			&entry.EncryptedPassword,
			&entry.EncryptedUsername,
			&entry.EncryptedURL,
			&entry.EncryptedNotes,
			&entry.CreatedAt,
			&entry.UpdatedAt,
		); err != nil {
			continue
		}
		passwords = append(passwords, entry)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Passwords retrieved successfully",
		Data:    passwords,
	})
}

// GetPassword returns a single password entry (ciphertext only).
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
		SELECT id, user_id, service_name, encrypted_password, encrypted_username, encrypted_url, encrypted_notes, created_at, updated_at
		FROM password_entries
		WHERE id = $1 AND user_id = $2
	`, passwordID, userID).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.ServiceName,
		&entry.EncryptedPassword,
		&entry.EncryptedUsername,
		&entry.EncryptedURL,
		&entry.EncryptedNotes,
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Password retrieved successfully",
		Data:    entry,
	})
}

// CreatePassword stores a new entry. The body already contains client-side
// ciphertext; the server persists it verbatim.
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
	if err := utils.Validate(&req); err != nil {
		http.Error(w, "Invalid input: "+err.Error(), http.StatusBadRequest)
		return
	}

	var entry models.PasswordEntry
	err = h.db.QueryRow(`
		INSERT INTO password_entries (user_id, service_name, encrypted_password, encrypted_username, encrypted_url, encrypted_notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, service_name, encrypted_password, encrypted_username, encrypted_url, encrypted_notes, created_at, updated_at
	`, userID, req.ServiceName, req.EncryptedPassword, req.EncryptedUsername, req.EncryptedURL, req.EncryptedNotes).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.ServiceName,
		&entry.EncryptedPassword,
		&entry.EncryptedUsername,
		&entry.EncryptedURL,
		&entry.EncryptedNotes,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to create password entry", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Password created successfully",
		Data:    entry,
	})
}

// UpdatePassword updates an existing entry. Only provided fields are changed.
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
	if err := utils.Validate(&req); err != nil {
		http.Error(w, "Invalid input: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Check the entry exists and belongs to the user
	var exists bool
	err = h.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM password_entries WHERE id = $1 AND user_id = $2)
	`, passwordID, userID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Password not found", http.StatusNotFound)
		return
	}

	// Build a dynamic update with parameterized placeholders only.
	updateFields := []string{}
	args := []interface{}{}
	argCount := 1

	if req.ServiceName != "" {
		updateFields = append(updateFields, "service_name = $"+strconv.Itoa(argCount))
		args = append(args, req.ServiceName)
		argCount++
	}
	if req.EncryptedPassword != "" {
		updateFields = append(updateFields, "encrypted_password = $"+strconv.Itoa(argCount))
		args = append(args, req.EncryptedPassword)
		argCount++
	}
	if req.EncryptedUsername != nil {
		updateFields = append(updateFields, "encrypted_username = $"+strconv.Itoa(argCount))
		args = append(args, req.EncryptedUsername)
		argCount++
	}
	if req.EncryptedURL != nil {
		updateFields = append(updateFields, "encrypted_url = $"+strconv.Itoa(argCount))
		args = append(args, req.EncryptedURL)
		argCount++
	}
	if req.EncryptedNotes != nil {
		updateFields = append(updateFields, "encrypted_notes = $"+strconv.Itoa(argCount))
		args = append(args, req.EncryptedNotes)
		argCount++
	}

	if len(updateFields) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	updateFields = append(updateFields, "updated_at = NOW()")
	args = append(args, passwordID, userID)

	query := `
		UPDATE password_entries
		SET ` + strings.Join(updateFields, ", ") + `
		WHERE id = $` + strconv.Itoa(argCount) + ` AND user_id = $` + strconv.Itoa(argCount+1) + `
		RETURNING id, user_id, service_name, encrypted_password, encrypted_username, encrypted_url, encrypted_notes, created_at, updated_at
	`

	var entry models.PasswordEntry
	err = h.db.QueryRow(query, args...).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.ServiceName,
		&entry.EncryptedPassword,
		&entry.EncryptedUsername,
		&entry.EncryptedURL,
		&entry.EncryptedNotes,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to update password entry", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Password updated successfully",
		Data:    entry,
	})
}

// DeletePassword deletes a password entry.
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

// Helper function to get user ID from Firebase UID
func (h *PasswordHandler) getUserID(firebaseUID string) (uuid.UUID, error) {
	var userID uuid.UUID
	err := h.db.QueryRow(`
		SELECT id FROM users WHERE firebase_uid = $1
	`, firebaseUID).Scan(&userID)
	return userID, err
}
