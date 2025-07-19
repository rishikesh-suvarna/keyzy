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
	// Load configuration first
	cfg := config.Load()

	// Initialize Firebase after config is loaded
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

	// Setup routes
	router := mux.NewRouter()

	// Apply CORS middleware
	router.Use(middleware.CORS)

	// Public routes
	router.HandleFunc("/api/auth/auth/register", authHandler.Register).Methods("POST")
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Protected routes
	api := router.PathPrefix("/api").Subrouter()
	api.Use(middleware.AuthMiddleware)

	// User routes
	api.HandleFunc("/user/profile", authHandler.GetProfile).Methods("GET")

	// Password routes
	api.HandleFunc("/passwords", passwordHandler.GetPasswords).Methods("GET")
	api.HandleFunc("/passwords", passwordHandler.CreatePassword).Methods("POST")
	api.HandleFunc("/passwords/{id}", passwordHandler.GetPassword).Methods("GET")
	api.HandleFunc("/passwords/{id}", passwordHandler.UpdatePassword).Methods("PUT")
	api.HandleFunc("/passwords/{id}", passwordHandler.DeletePassword).Methods("DELETE")

	// Password generation route
	api.HandleFunc("/generate-password", passwordHandler.GeneratePassword).Methods("POST")

	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
