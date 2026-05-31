package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL                  string
	FirebaseProject              string
	GoogleApplicationCredentials string
	Port                         string
	AllowedOrigins               []string
	AllowInsecureDevAuth         bool
}

func Load() *Config {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found or error loading it: %v", err)
		log.Printf("Using environment variables...")
	}

	// Note: there is no server-side encryption key. Encryption is performed
	// client-side (zero-knowledge); the server only ever stores ciphertext.

	config := &Config{
		DatabaseURL:                  getEnv("DATABASE_URL", ""),
		FirebaseProject:              getEnv("FIREBASE_PROJECT_ID", ""),
		GoogleApplicationCredentials: getEnv("GOOGLE_APPLICATION_CREDENTIALS", ""),
		Port:                         getEnv("PORT", "8080"),
		AllowedOrigins:               parseOrigins(getEnv("ALLOWED_ORIGINS", "")),
		AllowInsecureDevAuth:         getEnv("ALLOW_INSECURE_DEV_AUTH", "") == "true",
	}

	if config.FirebaseProject == "your-firebase-project-id" {
		log.Printf("Warning: Using default Firebase project ID. Set FIREBASE_PROJECT_ID environment variable.")
	}

	return config
}

// parseOrigins splits a comma-separated ALLOWED_ORIGINS value into a trimmed list.
func parseOrigins(raw string) []string {
	var origins []string
	for _, o := range strings.Split(raw, ",") {
		if o = strings.TrimSpace(o); o != "" {
			origins = append(origins, o)
		}
	}
	return origins
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
