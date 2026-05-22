package retry

import (
	"time"
)

// IsRetryable returns true if the error indicates a transient condition (e.g. RBAC propagation)
// that may succeed on retry. Provider-specific predicates should be used.
type IsRetryable func(err error) bool

// Do retries fn up to attempts times, waiting delay between attempts, when isRetryable returns true.
// Returns immediately on success or when isRetryable returns false (non-retryable error).
func Do[T any](attempts int, delay time.Duration, fn func() (T, error), isRetryable IsRetryable) (T, error) {
	var result T
	var err error
	for i := 0; i < attempts; i++ {
		result, err = fn()
		if err == nil {
			return result, nil
		}
		if isRetryable == nil || !isRetryable(err) {
			return result, err
		}
		if i < attempts-1 {
			time.Sleep(delay)
		}
	}
	return result, err
}

// DoVoid retries fn up to attempts times, waiting delay between attempts, when isRetryable returns true.
// For functions that return only error.
func DoVoid(attempts int, delay time.Duration, fn func() error, isRetryable IsRetryable) error {
	var err error
	for i := 0; i < attempts; i++ {
		err = fn()
		if err == nil {
			return nil
		}
		if isRetryable == nil || !isRetryable(err) {
			return err
		}
		if i < attempts-1 {
			time.Sleep(delay)
		}
	}
	return err
}
