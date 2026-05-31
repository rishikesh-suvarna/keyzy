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

	// Wire runtime config (CORS allowlist, dev-auth flag) into middleware
	middleware.Configure(cfg)

	// Initialize Firebase. Fail closed: if auth can't initialize we refuse to
	// start, unless the insecure dev bypass has been explicitly enabled.
	if err := middleware.InitializeFirebase(cfg); err != nil {
		if cfg.AllowInsecureDevAuth {
			log.Printf("WARNING: %v", err)
			log.Printf("WARNING: continuing with ALLOW_INSECURE_DEV_AUTH — DO NOT use in production")
		} else {
			log.Fatalf("Failed to initialize authentication: %v", err)
		}
	}

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
	passwordHandler := handlers.NewPasswordHandler(db)
	vaultHandler := handlers.NewVaultHandler(db)

	// Setup router
	router := mux.NewRouter()

	router.Use(middleware.CORS)

	// Public routes
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	}).Methods("GET", "OPTIONS")

	// Protected routes
	api := router.PathPrefix("/api").Subrouter()

	// Apply auth middleware to API routes
	api.Use(middleware.AuthMiddleware)

	// Register requires a verified token; identity comes from the token, not the body
	api.HandleFunc("/auth/register", authHandler.Register).Methods("POST", "OPTIONS")

	// User routes
	api.HandleFunc("/user/profile", authHandler.GetProfile).Methods("GET", "OPTIONS")

	// Vault key material (zero-knowledge): salt + wrapped vault key
	api.HandleFunc("/vault", vaultHandler.GetVault).Methods("GET", "OPTIONS")
	api.HandleFunc("/vault", vaultHandler.SetupVault).Methods("POST", "OPTIONS")

	// Password routes
	api.HandleFunc("/passwords", passwordHandler.GetPasswords).Methods("GET", "OPTIONS")
	api.HandleFunc("/passwords", passwordHandler.CreatePassword).Methods("POST", "OPTIONS")
	api.HandleFunc("/passwords/{id}", passwordHandler.GetPassword).Methods("GET", "OPTIONS")
	api.HandleFunc("/passwords/{id}", passwordHandler.UpdatePassword).Methods("PUT", "OPTIONS")
	api.HandleFunc("/passwords/{id}", passwordHandler.DeletePassword).Methods("DELETE", "OPTIONS")

	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)

	log.Fatal(http.ListenAndServe(":"+port, router))
}
