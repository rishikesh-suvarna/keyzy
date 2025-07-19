package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL                  string
	EncryptionKey                string
	FirebaseProject              string
	GoogleApplicationCredentials string
	Port                         string
}

func Load() *Config {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found or error loading it: %v", err)
		log.Printf("Using environment variables...")
	}

	config := &Config{
		DatabaseURL:                  getEnv("DATABASE_URL", "postgres://user:password@localhost/password_manager?sslmode=disable"),
		EncryptionKey:                getEnv("ENCRYPTION_KEY", "your-32-character-secret-key-here"),
		FirebaseProject:              getEnv("FIREBASE_PROJECT_ID", "your-firebase-project-id"),
		GoogleApplicationCredentials: getEnv("GOOGLE_APPLICATION_CREDENTIALS", ""),
		Port:                         getEnv("PORT", "8080"),
	}

	// Clean and validate encryption key
	config.EncryptionKey = strings.TrimSpace(config.EncryptionKey)
	// Remove any URL encoding characters
	config.EncryptionKey = strings.ReplaceAll(config.EncryptionKey, "%", "")

	// If key is still not 32 characters, truncate or pad it
	if len(config.EncryptionKey) > 32 {
		config.EncryptionKey = config.EncryptionKey[:32]
		log.Printf("Warning: Encryption key was too long, truncated to 32 characters")
	} else if len(config.EncryptionKey) < 32 {
		// Pad with zeros if too short (not recommended for production)
		for len(config.EncryptionKey) < 32 {
			config.EncryptionKey += "0"
		}
		log.Printf("Warning: Encryption key was too short, padded to 32 characters")
	}

	if config.FirebaseProject == "your-firebase-project-id" {
		log.Printf("Warning: Using default Firebase project ID. Set FIREBASE_PROJECT_ID environment variable.")
	}

	// Print config for debugging (without sensitive data)
	log.Printf("Using environment variable DATABASE_URL=%s", config.DatabaseURL)
	log.Printf("Using environment variable ENCRYPTION_KEY=%s", maskKey(config.EncryptionKey))
	log.Printf("Using environment variable FIREBASE_PROJECT_ID=%s", config.FirebaseProject)
	log.Printf("Using environment variable GOOGLE_APPLICATION_CREDENTIALS=%s", config.GoogleApplicationCredentials)
	log.Printf("Using environment variable PORT=%s", config.Port)

	return config
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func maskKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "****" + key[len(key)-4:]
}
