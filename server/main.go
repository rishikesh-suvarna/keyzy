package main

import (
	"log"
	"net/http"

	"password-manager/config"
	"password-manager/database"
	"password-manager/handlers"
	"password-manager/middleware"

	"github.com/gorilla/mux"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize Firebase
	middleware.InitializeFirebase()

	// Initialize database connection
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db)
	passwordHandler := handlers.NewPasswordHandler(db, cfg.EncryptionKey)

	// Setup router
	router := mux.NewRouter()

	router.Use(middleware.CORS)

	// Public routes
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	}).Methods("GET", "OPTIONS")

	router.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")

	// Protected routes
	api := router.PathPrefix("/api").Subrouter()

	// Apply CORS middleware to API routes
	api.Use(middleware.AuthMiddleware)

	// User routes
	api.HandleFunc("/user/profile", authHandler.GetProfile).Methods("GET", "OPTIONS")

	// Password routes
	api.HandleFunc("/passwords", passwordHandler.GetPasswords).Methods("GET", "OPTIONS")
	api.HandleFunc("/passwords", passwordHandler.CreatePassword).Methods("POST", "OPTIONS")
	api.HandleFunc("/passwords/{id}", passwordHandler.GetPassword).Methods("GET", "OPTIONS")
	api.HandleFunc("/passwords/{id}", passwordHandler.UpdatePassword).Methods("PUT", "OPTIONS")
	api.HandleFunc("/passwords/{id}", passwordHandler.DeletePassword).Methods("DELETE", "OPTIONS")

	// Password generation route
	api.HandleFunc("/generate-password", passwordHandler.GeneratePassword).Methods("POST", "OPTIONS")

	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)

	log.Fatal(http.ListenAndServe(":"+port, router))
}
