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
		DatabaseURL:                  getEnv("DATABASE_URL", ""),
		EncryptionKey:                getEnv("ENCRYPTION_KEY", ""),
		FirebaseProject:              getEnv("FIREBASE_PROJECT_ID", ""),
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

	return config
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
