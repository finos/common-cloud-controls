package runner

import "testing"

func TestTagFilterSkipsTestIdentities(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		tags []string
		want bool
	}{
		{"empty", nil, false},
		{"cn05 only", []string{"@Behavioural", "@CCC.ObjStor.CN05"}, true},
		{"cn05 and cn01", []string{"@CCC.ObjStor.CN05", "@CCC.ObjStor.CN01"}, false},
		{"core cn05", []string{"@CCC.Core.CN05"}, false},
		{"behavioural only", []string{"@Behavioural"}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := tagFilterSkipsTestIdentities(tc.tags); got != tc.want {
				t.Errorf("tagFilterSkipsTestIdentities(%v) = %v, want %v", tc.tags, got, tc.want)
			}
		})
	}
}
