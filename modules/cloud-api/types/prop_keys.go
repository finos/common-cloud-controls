package types

import (
	"strings"
	"unicode"
)

// StructFieldToKebab maps a Go struct field name to a lower-kebab-case prop key (e.g. ResourceName → resource-name).
func StructFieldToKebab(fieldName string) string {
	if fieldName == "" {
		return ""
	}
	var b strings.Builder
	for i, r := range fieldName {
		if unicode.IsUpper(r) {
			if i > 0 {
				b.WriteByte('-')
			}
			b.WriteRune(unicode.ToLower(r))
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}
