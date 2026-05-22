package objstorage

import "testing"

func TestServiceParamString(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		params map[string]interface{}
		key    string
		want   string
	}{
		{"nil map", nil, "bucket", ""},
		{"missing key", map[string]interface{}{"other": "x"}, "bucket", ""},
		{"string value", map[string]interface{}{"bucket": "my-bucket"}, "bucket", "my-bucket"},
		{"non-string value", map[string]interface{}{"bucket": 42}, "bucket", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := serviceParamString(tt.params, tt.key); got != tt.want {
				t.Errorf("serviceParamString() = %q, want %q", got, tt.want)
			}
		})
	}
}
