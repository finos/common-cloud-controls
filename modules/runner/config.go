package runner

import (
	"fmt"
	"os"
)

// ExpandVars substitutes ${VAR} / $VAR in Privateer vars using the process environment.
// Privateer does not expand YAML placeholders; the plugin must call this before use.
func ExpandVars(vars map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(vars))
	for k, v := range vars {
		out[k] = expandVarValue(v)
	}
	return out
}

func expandVarValue(v interface{}) interface{} {
	switch val := v.(type) {
	case string:
		return os.ExpandEnv(val)
	case map[string]interface{}:
		out := make(map[string]interface{}, len(val))
		for k, inner := range val {
			out[k] = expandVarValue(inner)
		}
		return out
	case map[interface{}]interface{}:
		out := make(map[string]interface{}, len(val))
		for k, inner := range val {
			out[fmt.Sprintf("%v", k)] = expandVarValue(inner)
		}
		return out
	default:
		return v
	}
}
