package main

import (
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	config, err := loadConfig()
	if err != nil {
		logger.Error("invalid configuration", "error", err)
		os.Exit(1)
	}

	httpServer := &http.Server{
		Addr:              config.listenAddress,
		Handler:           newServer(config, logger).routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       config.maxProbeTimeout + 2*time.Second,
		WriteTimeout:      config.maxProbeTimeout + 2*time.Second,
		IdleTimeout:       30 * time.Second,
		MaxHeaderBytes:    16 << 10,
	}
	logger.Info("starting reachability probe",
		"address", config.listenAddress,
		"observer", config.observer,
	)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
