package retry

import (
	"errors"
	"testing"
	"time"
)

func TestDo_SucceedsFirstAttempt(t *testing.T) {
	t.Parallel()
	got, err := Do(3, time.Millisecond, func() (int, error) {
		return 42, nil
	}, nil)
	if err != nil || got != 42 {
		t.Fatalf("Do() = (%d, %v), want (42, nil)", got, err)
	}
}

func TestDo_RetriesThenSucceeds(t *testing.T) {
	t.Parallel()
	attempts := 0
	got, err := Do(3, time.Millisecond, func() (string, error) {
		attempts++
		if attempts < 2 {
			return "", errors.New("transient")
		}
		return "ok", nil
	}, func(err error) bool { return err != nil })
	if err != nil || got != "ok" || attempts != 2 {
		t.Fatalf("Do() = (%q, %v, attempts=%d), want (ok, nil, 2)", got, err, attempts)
	}
}

func TestDo_NonRetryableStopsImmediately(t *testing.T) {
	t.Parallel()
	attempts := 0
	_, err := Do(5, time.Millisecond, func() (int, error) {
		attempts++
		return 0, errors.New("fatal")
	}, func(err error) bool { return false })
	if err == nil || attempts != 1 {
		t.Fatalf("attempts=%d err=%v, want 1 attempt and error", attempts, err)
	}
}

func TestDoVoid_Succeeds(t *testing.T) {
	t.Parallel()
	if err := DoVoid(2, time.Millisecond, func() error { return nil }, nil); err != nil {
		t.Fatalf("DoVoid() = %v, want nil", err)
	}
}
