package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"password-manager/config"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// CORS middleware with debug logging
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		log.Printf("Method: %s, Origin: %s, Path: %s", r.Method, origin, r.URL.Path)

		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization, X-CSRF-Token, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
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

// InitializeFirebase initializes Firebase - call this after config is loaded
func InitializeFirebase() {
	ctx := context.Background()

	// Get service account path from config
	serviceAccountPath := config.Load().GoogleApplicationCredentials

	var app *firebase.App
	var err error

	if serviceAccountPath != "" {
		// Check if file exists
		if _, err := os.Stat(serviceAccountPath); os.IsNotExist(err) {
			log.Printf("Warning: Firebase service account file not found at: %s", serviceAccountPath)
			log.Printf("Firebase authentication will be disabled (development mode)")
			return
		}

		app, err = firebase.NewApp(ctx, nil, option.WithCredentialsFile(serviceAccountPath))
	} else {
		log.Printf("No GOOGLE_APPLICATION_CREDENTIALS found, trying default credentials...")
		// Try default credentials (useful for Google Cloud deployment)
		app, err = firebase.NewApp(ctx, nil)
	}

	if err != nil {
		log.Printf("Warning: Failed to initialize Firebase app: %v", err)
		log.Printf("Firebase authentication will be disabled (development mode)")
		return
	}

	authClient, err = app.Auth(ctx)
	if err != nil {
		log.Printf("Warning: Failed to get Firebase Auth client: %v", err)
		authClient = nil
	} else {
		log.Printf("Firebase authentication initialized successfully")
	}
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
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Authorization header required",
			})
			return
		}

		// Extract token
		tokenParts := strings.Split(authHeader, "Bearer ")
		if len(tokenParts) != 2 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Invalid authorization header format",
			})
			return
		}

		idToken := tokenParts[1]

		if authClient == nil {
			ctx := context.WithValue(r.Context(), "user_id", "dev-user-id")
			ctx = context.WithValue(ctx, "firebase_uid", "dev-firebase-uid")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Verify Firebase token
		token, err := authClient.VerifyIDToken(context.Background(), idToken)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error":   "Invalid token",
				"message": err.Error(),
			})
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), "firebase_uid", token.UID)
		ctx = context.WithValue(ctx, "user_email", token.Claims["email"])

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Helper function to get user ID from context
func GetFirebaseUID(r *http.Request) string {
	if uid := r.Context().Value("firebase_uid"); uid != nil {
		return uid.(string)
	}
	return ""
}

// Helper function to get user email from context
func GetUserEmail(r *http.Request) string {
	if email := r.Context().Value("user_email"); email != nil {
		return email.(string)
	}
	return ""
}
