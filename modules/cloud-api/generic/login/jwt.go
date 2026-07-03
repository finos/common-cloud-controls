package login

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"
)

// refreshSkew is how much lifetime we want left before skipping a re-login.
const refreshSkew = 5 * time.Minute

func tokenFreshEnough(exp time.Time, ok bool) bool {
	if !ok || exp.IsZero() {
		return false
	}
	return time.Until(exp) > refreshSkew
}

// jwtExpiry returns the exp claim time for a JWT access token, if present.
func jwtExpiry(accessToken string) (time.Time, bool) {
	parts := strings.Split(strings.TrimSpace(accessToken), ".")
	if len(parts) != 3 {
		return time.Time{}, false
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		raw, err = base64.StdEncoding.DecodeString(parts[1])
		if err != nil {
			return time.Time{}, false
		}
	}
	var claims struct {
		Exp float64 `json:"exp"`
	}
	if err := json.Unmarshal(raw, &claims); err != nil || claims.Exp == 0 {
		return time.Time{}, false
	}
	return time.Unix(int64(claims.Exp), 0), true
}
