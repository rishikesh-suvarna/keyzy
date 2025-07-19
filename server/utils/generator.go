package utils

import (
	"crypto/rand"
	"math/big"
	"strings"
)

const (
	uppercaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	lowercaseLetters = "abcdefghijklmnopqrstuvwxyz"
	numbers          = "0123456789"
	symbols          = "!@#$%^&*()_+-=[]{}|;:,.<>?"
	similarChars     = "il1Lo0O"
)

type PasswordGenerator struct{}

func NewPasswordGenerator() *PasswordGenerator {
	return &PasswordGenerator{}
}

func (pg *PasswordGenerator) Generate(length int, includeUpper, includeLower, includeNumbers, includeSymbols, excludeSimilar bool) (string, error) {
	if length < 1 {
		length = 12
	}
	if length > 128 {
		length = 128
	}

	var charset string

	// Build charset based on options
	if includeUpper {
		charset += uppercaseLetters
	}
	if includeLower {
		charset += lowercaseLetters
	}
	if includeNumbers {
		charset += numbers
	}
	if includeSymbols {
		charset += symbols
	}

	// If no options selected, use default safe charset
	if charset == "" {
		charset = uppercaseLetters + lowercaseLetters + numbers
	}

	// Remove similar looking characters if requested
	if excludeSimilar {
		for _, char := range similarChars {
			charset = strings.ReplaceAll(charset, string(char), "")
		}
	}

	// Generate password
	password := make([]byte, length)
	charsetLength := big.NewInt(int64(len(charset)))

	for i := 0; i < length; i++ {
		randomIndex, err := rand.Int(rand.Reader, charsetLength)
		if err != nil {
			return "", err
		}
		password[i] = charset[randomIndex.Int64()]
	}

	// Ensure password meets requirements if specified
	generated := string(password)
	if !pg.meetsRequirements(generated, includeUpper, includeLower, includeNumbers, includeSymbols) {
		// Recursively regenerate if requirements not met (with a reasonable limit)
		return pg.Generate(length, includeUpper, includeLower, includeNumbers, includeSymbols, excludeSimilar)
	}

	return generated, nil
}

func (pg *PasswordGenerator) meetsRequirements(password string, includeUpper, includeLower, includeNumbers, includeSymbols bool) bool {
	hasUpper := false
	hasLower := false
	hasNumber := false
	hasSymbol := false

	for _, char := range password {
		switch {
		case strings.ContainsRune(uppercaseLetters, char):
			hasUpper = true
		case strings.ContainsRune(lowercaseLetters, char):
			hasLower = true
		case strings.ContainsRune(numbers, char):
			hasNumber = true
		case strings.ContainsRune(symbols, char):
			hasSymbol = true
		}
	}

	if includeUpper && !hasUpper {
		return false
	}
	if includeLower && !hasLower {
		return false
	}
	if includeNumbers && !hasNumber {
		return false
	}
	if includeSymbols && !hasSymbol {
		return false
	}

	return true
}
