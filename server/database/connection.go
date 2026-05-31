package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/lib/pq"
)

func Connect(databaseURL string) (*sql.DB, error) {
	// Vaults are encrypted, but the connection still carries auth tokens and
	// metadata. Warn loudly if the DB link is not using TLS.
	if strings.Contains(databaseURL, "sslmode=disable") {
		log.Printf("WARNING: database connection has sslmode=disable — use sslmode=require (or verify-full) in production")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)

	return db, nil
}

// migration is a single, named schema change applied exactly once.
type migration struct {
	name string
	stmt string
}

// migrations are applied in order. Each runs once and is recorded in
// schema_migrations, so one-time changes (like the legacy wipe in 003) are safe
// to leave in the list permanently.
var migrations = []migration{
	{
		name: "001_init",
		stmt: `
			CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

			CREATE TABLE IF NOT EXISTS users (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				firebase_uid VARCHAR(255) UNIQUE NOT NULL,
				email VARCHAR(255) NOT NULL,
				created_at TIMESTAMP DEFAULT NOW(),
				updated_at TIMESTAMP DEFAULT NOW()
			);

			CREATE TABLE IF NOT EXISTS password_entries (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				user_id UUID REFERENCES users(id) ON DELETE CASCADE,
				service_name VARCHAR(255) NOT NULL,
				service_url VARCHAR(500),
				username VARCHAR(255),
				encrypted_password TEXT NOT NULL,
				notes TEXT,
				created_at TIMESTAMP DEFAULT NOW(),
				updated_at TIMESTAMP DEFAULT NOW()
			);

			CREATE INDEX IF NOT EXISTS idx_password_entries_user_id ON password_entries(user_id);
			CREATE INDEX IF NOT EXISTS idx_password_entries_service_name ON password_entries(service_name);
			CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
		`,
	},
	{
		// Zero-knowledge vault key material. Per-user KDF salt + the DEK wrapped
		// under the master-password-derived key. The server never sees the DEK
		// or the master password.
		name: "002_vault_keys",
		stmt: `
			ALTER TABLE users ADD COLUMN IF NOT EXISTS kdf_salt TEXT;
			ALTER TABLE users ADD COLUMN IF NOT EXISTS wrapped_vault_key TEXT;
			ALTER TABLE users ADD COLUMN IF NOT EXISTS master_password_hint TEXT;
		`,
	},
	{
		// Move to client-side encryption. encrypted_password now holds the client
		// envelope; add encrypted columns for the other sensitive fields and drop
		// the old plaintext columns. Legacy server-encrypted rows are wiped once
		// (no data to migrate).
		name: "003_entry_encrypted_fields",
		stmt: `
			DELETE FROM password_entries;
			ALTER TABLE password_entries ADD COLUMN IF NOT EXISTS encrypted_username TEXT;
			ALTER TABLE password_entries ADD COLUMN IF NOT EXISTS encrypted_notes TEXT;
			ALTER TABLE password_entries ADD COLUMN IF NOT EXISTS encrypted_url TEXT;
			ALTER TABLE password_entries DROP COLUMN IF EXISTS username;
			ALTER TABLE password_entries DROP COLUMN IF EXISTS service_url;
			ALTER TABLE password_entries DROP COLUMN IF EXISTS notes;
		`,
	},
}

func RunMigrations(db *sql.DB) error {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			name TEXT PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT NOW()
		);
	`); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	for _, m := range migrations {
		var exists bool
		if err := db.QueryRow(
			`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1)`, m.name,
		).Scan(&exists); err != nil {
			return fmt.Errorf("failed to check migration %s: %w", m.name, err)
		}
		if exists {
			continue
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("failed to begin migration %s: %w", m.name, err)
		}
		if _, err := tx.Exec(m.stmt); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to run migration %s: %w", m.name, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (name) VALUES ($1)`, m.name); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", m.name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", m.name, err)
		}
	}

	return nil
}
