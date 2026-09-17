package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestValidateDeterministicDecisions(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		marker  string
		allowed bool
	}{
		{name: "unmarked object is allowed", allowed: true},
		{name: "allow value is allowed", marker: "allow", allowed: true},
		{name: "reject marker is denied", marker: rejectMarker, allowed: false},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			object := map[string]any{"metadata": map[string]any{
				"name":   "probe",
				"labels": map[string]string{markerKey: tt.marker},
			}}
			objectJSON, err := json.Marshal(object)
			if err != nil {
				t.Fatal(err)
			}
			review := admissionReview{
				APIVersion: "admission.k8s.io/v1",
				Kind:       "AdmissionReview",
				Request: &admissionRequest{
					UID:       "test-uid",
					Namespace: "ccc-admission-webhook-test",
					Name:      "probe",
					Object:    objectJSON,
				},
			}
			body, err := json.Marshal(review)
			if err != nil {
				t.Fatal(err)
			}

			request := httptest.NewRequest(http.MethodPost, "/validate", bytes.NewReader(body))
			recorder := httptest.NewRecorder()
			testServer().routes().ServeHTTP(recorder, request)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d: %s", recorder.Code, http.StatusOK, recorder.Body.String())
			}
			var got admissionReview
			if err := json.Unmarshal(recorder.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if got.Response == nil || got.Response.UID != "test-uid" || got.Response.Allowed != tt.allowed {
				t.Fatalf("unexpected response: %#v", got.Response)
			}
			if !tt.allowed && (got.Response.Status == nil || got.Response.Status.Message != rejectionReason) {
				t.Fatalf("missing deterministic rejection reason: %#v", got.Response.Status)
			}
		})
	}
}

func TestValidateRejectsInvalidReview(t *testing.T) {
	t.Parallel()
	request := httptest.NewRequest(http.MethodPost, "/validate", bytes.NewBufferString(`{"request":null}`))
	recorder := httptest.NewRecorder()

	testServer().routes().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestHealthAndReadiness(t *testing.T) {
	t.Parallel()
	handler := testServer().routes()
	for _, path := range []string{"/healthz", "/readyz"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, request)
		if recorder.Code != http.StatusOK {
			t.Fatalf("%s status = %d, want %d", path, recorder.Code, http.StatusOK)
		}
	}
}

func testServer() *server {
	return newServer(slog.New(slog.NewTextHandler(io.Discard, nil)))
}
