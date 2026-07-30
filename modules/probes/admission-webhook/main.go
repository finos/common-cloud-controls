package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"
)

const (
	markerKey       = "ccc.finos.org/admission-webhook-probe"
	rejectMarker    = "reject"
	rejectionReason = "rejected by FINOS CCC admission webhook probe"
	maxRequestBytes = 1 << 20
)

type admissionReview struct {
	APIVersion string             `json:"apiVersion,omitempty"`
	Kind       string             `json:"kind,omitempty"`
	Request    *admissionRequest  `json:"request,omitempty"`
	Response   *admissionResponse `json:"response,omitempty"`
}

type admissionRequest struct {
	UID       string          `json:"uid"`
	Namespace string          `json:"namespace,omitempty"`
	Name      string          `json:"name,omitempty"`
	Object    json.RawMessage `json:"object"`
}

type admissionResponse struct {
	UID     string  `json:"uid"`
	Allowed bool    `json:"allowed"`
	Status  *status `json:"status,omitempty"`
}

type status struct {
	Code    int32  `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

type objectMetadata struct {
	Metadata struct {
		Labels      map[string]string `json:"labels"`
		Annotations map[string]string `json:"annotations"`
	} `json:"metadata"`
}

type server struct {
	logger *slog.Logger
	ready  bool
}

func newServer(logger *slog.Logger) *server {
	return &server{logger: logger, ready: true}
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.health)
	mux.HandleFunc("/readyz", s.readiness)
	mux.HandleFunc("/validate", s.validate)
	return mux
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = io.WriteString(w, "ok\n")
}

func (s *server) readiness(w http.ResponseWriter, _ *http.Request) {
	if !s.ready {
		http.Error(w, "not ready", http.StatusServiceUnavailable)
		return
	}
	s.health(w, nil)
}

func (s *server) validate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxRequestBytes))
	if err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var review admissionReview
	if err := json.Unmarshal(body, &review); err != nil || review.Request == nil || review.Request.UID == "" {
		http.Error(w, "invalid AdmissionReview", http.StatusBadRequest)
		return
	}

	reject, err := hasRejectMarker(review.Request.Object)
	if err != nil {
		http.Error(w, "invalid admitted object", http.StatusBadRequest)
		return
	}

	response := admissionReview{
		APIVersion: "admission.k8s.io/v1",
		Kind:       "AdmissionReview",
		Response: &admissionResponse{
			UID:     review.Request.UID,
			Allowed: !reject,
		},
	}
	if reject {
		response.Response.Status = &status{Code: http.StatusForbidden, Message: rejectionReason}
	}

	s.logger.Info("admission decision",
		"uid", review.Request.UID,
		"namespace", review.Request.Namespace,
		"name", review.Request.Name,
		"allowed", !reject,
	)
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		s.logger.Error("write admission response", "error", err)
	}
}

func hasRejectMarker(raw json.RawMessage) (bool, error) {
	if len(raw) == 0 {
		return false, errors.New("object is required")
	}
	var object objectMetadata
	if err := json.Unmarshal(raw, &object); err != nil {
		return false, err
	}
	return object.Metadata.Labels[markerKey] == rejectMarker ||
		object.Metadata.Annotations[markerKey] == rejectMarker, nil
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	address := envOrDefault("LISTEN_ADDRESS", ":8443")
	certFile := envOrDefault("TLS_CERT_FILE", "/tls/tls.crt")
	keyFile := envOrDefault("TLS_KEY_FILE", "/tls/tls.key")

	httpServer := &http.Server{
		Addr:              address,
		Handler:           newServer(logger).routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       30 * time.Second,
		MaxHeaderBytes:    16 << 10,
	}

	logger.Info("starting admission webhook probe", "address", address)
	if err := httpServer.ListenAndServeTLS(certFile, keyFile); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server stopped", "error", fmt.Sprintf("%v", err))
		os.Exit(1)
	}
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
