package lifecycle

import "testing"

func TestQualifyGKEOpName(t *testing.T) {
	t.Parallel()
	cases := []struct {
		project, location, op, want string
	}{
		{
			project: "p", location: "us-east1", op: "operation-abc",
			want: "projects/p/locations/us-east1/operations/operation-abc",
		},
		{
			project: "p", location: "us-east1", op: "operations/operation-abc",
			want: "projects/p/locations/us-east1/operations/operation-abc",
		},
		{
			project: "p", location: "", op: "operation-abc",
			want: "projects/p/locations/-/operations/operation-abc",
		},
		{
			project: "p", location: "us-east1",
			op:   "projects/p/locations/us-east1/operations/operation-abc",
			want: "projects/p/locations/us-east1/operations/operation-abc",
		},
		{project: "", location: "us-east1", op: "operation-abc", want: "operation-abc"},
		{project: "p", location: "us-east1", op: "  ", want: ""},
	}
	for _, tc := range cases {
		got := qualifyGKEOpName(tc.project, tc.location, tc.op)
		if got != tc.want {
			t.Errorf("qualifyGKEOpName(%q,%q,%q)=%q, want %q", tc.project, tc.location, tc.op, got, tc.want)
		}
	}
}
