package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"password-manager/middleware"
	"password-manager/models"
)

type AuthHandler struct {
	db *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

// Register creates a new user in our database after Firebase authentication
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FirebaseUID string `json:"firebase_uid"`
		Email       string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if user already exists
	var existingUser models.User
	err := h.db.QueryRow(`
		SELECT id, firebase_uid, email, created_at, updated_at 
		FROM users WHERE firebase_uid = $1
	`, req.FirebaseUID).Scan(
		&existingUser.ID,
		&existingUser.FirebaseUID,
		&existingUser.Email,
		&existingUser.CreatedAt,
		&existingUser.UpdatedAt,
	)

	if err == nil {
		// User already exists, return existing user
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.SuccessResponse{
			Message: "User already exists",
			Data:    existingUser,
		})
		return
	}

	if err != sql.ErrNoRows {
		// Database error
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Create new user
	var newUser models.User
	err = h.db.QueryRow(`
		INSERT INTO users (firebase_uid, email) 
		VALUES ($1, $2) 
		RETURNING id, firebase_uid, email, created_at, updated_at
	`, req.FirebaseUID, req.Email).Scan(
		&newUser.ID,
		&newUser.FirebaseUID,
		&newUser.Email,
		&newUser.CreatedAt,
		&newUser.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "User created successfully",
		Data:    newUser,
	})
}

// GetProfile returns the current user's profile
func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	firebaseUID := middleware.GetFirebaseUID(r)
	if firebaseUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var user models.User
	err := h.db.QueryRow(`
		SELECT id, firebase_uid, email, created_at, updated_at 
		FROM users WHERE firebase_uid = $1
	`, firebaseUID).Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.SuccessResponse{
		Message: "Profile retrieved successfully",
		Data:    user,
	})
}

// Helper function to get user by Firebase UID
func (h *AuthHandler) GetUserByFirebaseUID(firebaseUID string) (*models.User, error) {
	var user models.User
	err := h.db.QueryRow(`
		SELECT id, firebase_uid, email, created_at, updated_at 
		FROM users WHERE firebase_uid = $1
	`, firebaseUID).Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}
