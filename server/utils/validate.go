package utils

import "github.com/go-playground/validator/v10"

// validate is a shared, thread-safe validator instance. It enforces the
// `validate:"..."` struct tags declared on request models so that limits like
// max lengths and required fields are actually applied (previously the tags
// were decorative).
var validate = validator.New(validator.WithRequiredStructEnabled())

// Validate checks a struct against its validation tags, returning a non-nil
// error describing the first failing field.
func Validate(s any) error {
	return validate.Struct(s)
}
