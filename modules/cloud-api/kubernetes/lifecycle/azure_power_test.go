package lifecycle

import (
	"fmt"
	"testing"
)

func TestAksAlreadyAtPower(t *testing.T) {
	t.Parallel()
	cases := []struct {
		power, want string
		skip        bool
	}{
		{power: "Running", want: "Running", skip: true},
		{power: "Starting", want: "Running", skip: true},
		{power: "Stopped", want: "Running", skip: false},
		{power: "Stopping", want: "Running", skip: false},
		{power: "Stopped", want: "Stopped", skip: true},
		{power: "Stopping", want: "Stopped", skip: true},
		{power: "Running", want: "Stopped", skip: false},
		{power: "Starting", want: "Stopped", skip: false},
	}
	for _, tc := range cases {
		got := aksAlreadyAtPower(PowerStatus{Power: tc.power}, tc.want)
		if got != tc.skip {
			t.Errorf("power=%q want=%q: skip=%v, got %v", tc.power, tc.want, tc.skip, got)
		}
	}
}

func TestIsAKSStartAlreadyRunning(t *testing.T) {
	t.Parallel()
	err := fmt.Errorf("start AKS cluster returned HTTP 400: Operation is not allowed. Start managed cluster operation is only allowed on a stopped cluster.")
	if !isAKSStartAlreadyRunning(err) {
		t.Fatal("expected start-already-running to match Azure 400")
	}
	if isAKSStartAlreadyRunning(fmt.Errorf("HTTP 409 AnotherOperationInProgress")) {
		t.Fatal("in-progress conflict should not be treated as already running")
	}
}
