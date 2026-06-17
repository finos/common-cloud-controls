package vpc

import "testing"

func TestNormalizeStringList(t *testing.T) {
	t.Parallel()
	got := normalizeStringList([]string{" vpc-1 ", "vpc-2,vpc-3", "vpc-2", ""})
	want := []string{"vpc-1", "vpc-2", "vpc-3"}
	if len(got) != len(want) {
		t.Fatalf("normalizeStringList() = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("normalizeStringList() = %v, want %v", got, want)
		}
	}
}

func TestCn03StringSlice(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		input interface{}
		want  []string
	}{
		{"nil", nil, []string{}},
		{"string", "a,b", []string{"a", "b"}},
		{"slice", []interface{}{"x", "y"}, []string{"x", "y"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := cn03StringSlice(tt.input)
			if len(got) != len(tt.want) {
				t.Fatalf("cn03StringSlice() = %v, want %v", got, tt.want)
			}
			for i := range tt.want {
				if got[i] != tt.want[i] {
					t.Fatalf("cn03StringSlice() = %v, want %v", got, tt.want)
				}
			}
		})
	}
}

func TestFirstNonEmptyString(t *testing.T) {
	t.Parallel()
	if got := firstNonEmptyString("", "  ", "vpc-1"); got != "vpc-1" {
		t.Errorf("firstNonEmptyString() = %q, want vpc-1", got)
	}
	if got := firstNonEmptyString("", "<nil>"); got != "" {
		t.Errorf("firstNonEmptyString() = %q, want empty", got)
	}
}
