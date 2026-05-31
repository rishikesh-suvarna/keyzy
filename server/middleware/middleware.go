package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"password-manager/config"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// contextKey is a private type for request-context keys to avoid collisions
// with keys defined in other packages.
type contextKey string

const (
	ctxFirebaseUID contextKey = "firebase_uid"
	ctxUserEmail   contextKey = "user_email"
)

// Package-level configuration, populated by Configure() before serving.
var (
	allowedOrigins       = map[string]bool{}
	allowInsecureDevAuth = false
)

// Configure wires runtime config (CORS allowlist, dev-auth flag) into the
// middleware. Call this once at startup before the server starts handling
// requests.
func Configure(cfg *config.Config) {
	allowedOrigins = map[string]bool{}
	for _, o := range cfg.AllowedOrigins {
		allowedOrigins[o] = true
	}
	allowInsecureDevAuth = cfg.AllowInsecureDevAuth
}

// CORS middleware. Only origins on the configured allowlist are reflected;
// there is no wildcard fallback.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin != "" && allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization, X-CSRF-Token, X-Requested-With")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Firebase auth client (initialize once)
var authClient *auth.Client

// InitializeFirebase initializes Firebase auth. It returns an error if the
// auth client cannot be created; the caller decides whether that is fatal
// (production) or tolerable (explicit dev mode). It never silently disables
// authentication.
func InitializeFirebase(cfg *config.Config) error {
	ctx := context.Background()

	serviceAccountPath := cfg.GoogleApplicationCredentials

	var app *firebase.App
	var err error

	if serviceAccountPath != "" {
		if _, statErr := os.Stat(serviceAccountPath); os.IsNotExist(statErr) {
			return fmt.Errorf("Firebase service account file not found at: %s", serviceAccountPath)
		}
		app, err = firebase.NewApp(ctx, nil, option.WithCredentialsFile(serviceAccountPath))
	} else {
		log.Printf("No GOOGLE_APPLICATION_CREDENTIALS found, trying default credentials...")
		app, err = firebase.NewApp(ctx, nil)
	}

	if err != nil {
		return fmt.Errorf("failed to initialize Firebase app: %w", err)
	}

	authClient, err = app.Auth(ctx)
	if err != nil {
		return fmt.Errorf("failed to get Firebase Auth client: %w", err)
	}

	log.Printf("Firebase authentication initialized successfully")
	return nil
}

// AuthMiddleware validates Firebase JWT tokens
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}

		// Get Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeJSONError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		// Extract token
		tokenParts := strings.Split(authHeader, "Bearer ")
		if len(tokenParts) != 2 {
			writeJSONError(w, http.StatusUnauthorized, "Invalid authorization header format")
			return
		}

		idToken := tokenParts[1]

		if authClient == nil {
			// Fail closed: with no Firebase client we cannot verify anyone.
			// The insecure dev bypass is only available when explicitly enabled.
			if !allowInsecureDevAuth {
				writeJSONError(w, http.StatusServiceUnavailable, "Authentication is not available")
				return
			}
			log.Printf("WARNING: ALLOW_INSECURE_DEV_AUTH is enabled — accepting unverified request as dev user")
			ctx := context.WithValue(r.Context(), ctxFirebaseUID, "dev-firebase-uid")
			ctx = context.WithValue(ctx, ctxUserEmail, "dev@example.com")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Verify Firebase token
		token, err := authClient.VerifyIDToken(context.Background(), idToken)
		if err != nil {
			log.Printf("token verification failed: %v", err)
			writeJSONError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), ctxFirebaseUID, token.UID)
		if email, ok := token.Claims["email"].(string); ok {
			ctx = context.WithValue(ctx, ctxUserEmail, email)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// writeJSONError writes a generic JSON error without leaking internal detail.
func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// GetFirebaseUID returns the verified Firebase UID from the request context.
func GetFirebaseUID(r *http.Request) string {
	if uid, ok := r.Context().Value(ctxFirebaseUID).(string); ok {
		return uid
	}
	return ""
}

// GetUserEmail returns the verified user email from the request context.
func GetUserEmail(r *http.Request) string {
	if email, ok := r.Context().Value(ctxUserEmail).(string); ok {
		return email
	}
	return ""
}
