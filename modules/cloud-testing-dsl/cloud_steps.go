package cloud

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/cucumber/godog"
	"github.com/finos/common-cloud-controls/cloud-api/factory"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	generic "github.com/robmoffat/standard-cucumber-steps/go"
)

// Connection represents a network connection with state and I/O
type Connection struct {
	State      string    // "open" or "closed"
	Input      io.Writer // Stream to write data to the connection
	Output     string    // Buffer containing all the data received from the connection so far
	cmd        *exec.Cmd // The underlying command process
	outputBuf  *bytes.Buffer
	stateMu    sync.Mutex    // Protects State field
	mu         sync.Mutex    // Protects Output field
	stopReader chan struct{} // Channel to signal the reader goroutine to stop
}

// Close terminates the connection and kills the underlying process
func (c *Connection) Close() {
	c.stateMu.Lock()
	c.State = "closed"
	c.stateMu.Unlock()

	// Signal the reader goroutine to stop
	if c.stopReader != nil {
		close(c.stopReader)
	}

	if c.cmd != nil && c.cmd.Process != nil {
		c.cmd.Process.Kill()
	}
}

// GetState returns the current connection state (thread-safe)
func (c *Connection) GetState() string {
	c.stateMu.Lock()
	defer c.stateMu.Unlock()
	return c.State
}

// startOutputReader starts a goroutine that continuously reads from stdout and appends to Output
func (c *Connection) startOutputReader(reader io.Reader) {
	go func() {
		buf := make([]byte, 1024)
		for {
			select {
			case <-c.stopReader:
				return
			default:
				n, err := reader.Read(buf)
				if n > 0 {
					c.mu.Lock()
					c.outputBuf.Write(buf[:n])
					c.Output = c.outputBuf.String()
					c.mu.Unlock()
				}
				if err != nil {
					return
				}
			}
		}
	}()
}

// CloudWorld extends PropsWorld with cloud-specific functionality
type CloudWorld struct {
	*generic.PropsWorld
	Attachments []types.Attachment // CFI-specific: Store attachments for the current scenario
	mu          sync.RWMutex
}

// NewCloudWorld creates a new CloudWorld instance
func NewCloudWorld() *CloudWorld {
	return &CloudWorld{
		PropsWorld:  generic.NewPropsWorld(),
		Attachments: make([]types.Attachment, 0),
	}
}

// Attach adds an attachment to the current scenario (CFI-specific)
func (cw *CloudWorld) Attach(name, mediaType string, data []byte) {
	cw.mu.Lock()
	defer cw.mu.Unlock()
	cw.Attachments = append(cw.Attachments, types.Attachment{
		Name:      name,
		MediaType: mediaType,
		Data:      data,
	})
	fmt.Printf("📎 Attached: %s (%s, %d bytes)\n", name, mediaType, len(data))
}

// GetAttachments returns a copy of the current attachments (implements types.AttachmentProvider)
func (cw *CloudWorld) GetAttachments() []types.Attachment {
	cw.mu.RLock()
	defer cw.mu.RUnlock()

	// Return a copy to avoid race conditions
	attachmentsCopy := make([]types.Attachment, len(cw.Attachments))
	copy(attachmentsCopy, cw.Attachments)
	return attachmentsCopy
}

// ClearAttachments clears all attachments (implements types.AttachmentProvider)
func (cw *CloudWorld) ClearAttachments() {
	cw.mu.Lock()
	defer cw.mu.Unlock()
	cw.Attachments = make([]types.Attachment, 0)
}

// iAttachToTestOutput attaches content to the test output (CFI-specific step)
func (cw *CloudWorld) iAttachToTestOutput(content, name string) error {
	resolved := cw.HandleResolve(content)

	// Determine the media type and convert to bytes
	var data []byte
	var mediaType string

	switch v := resolved.(type) {
	case error:
		// Handle errors specifically - convert to text
		data = []byte(v.Error())
		mediaType = "text/plain"
	case string:
		data = []byte(v)
		mediaType = "text/plain"
	case []byte:
		data = v
		mediaType = "application/octet-stream"
	default:
		// Try to convert to JSON for complex objects
		jsonData, err := json.Marshal(v)
		if err != nil {
			return fmt.Errorf("failed to marshal attachment: %w", err)
		}
		data = jsonData
		mediaType = "application/json"
	}

	cw.Attach(name, mediaType, data)
	return nil
}

// RegisterSteps registers all cloud-specific step definitions
func (cw *CloudWorld) RegisterSteps(ctx *godog.ScenarioContext) {
	// Register generic steps first
	cw.PropsWorld.RegisterSteps(ctx)

	// CFI-specific attachment step
	ctx.Step(`^I attach "([^"]*)" to the test output as "([^"]*)"$`, cw.iAttachToTestOutput)

	// Cloud-specific steps matching README.md

	// OpenSSL connections
	ctx.Step(`^an openssl s_client request to "([^"]*)" on "([^"]*)" protocol "([^"]*)"$`, cw.opensslClientRequestWithProtocol)
	ctx.Step(`^an openssl s_client request using "([^"]*)" to "([^"]*)" on "([^"]*)" protocol "([^"]*)"$`, func(tlsVersion, port, host, protocol string) error {
		return cw.opensslClientRequestWithTLSAndProtocol(tlsVersion, port, host, protocol)
	})

	// Plain client connections
	ctx.Step(`^a client connects to "([^"]*)" with protocol "([^"]*)" on port "([^"]*)"$`, cw.clientConnectsWithProtocol)

	// Connection operations
	ctx.Step(`^I transmit "([^"]*)" to "([^"]*)"$`, cw.transmitToConnection)
	ctx.Step(`^I close connection "([^"]*)"$`, cw.closeConnection)
	ctx.Step(`^"([^"]*)" state is (open|closed)$`, cw.checkConnectionState)

	// SSL Support reports
	ctx.Step(`^"([^"]*)" contains details of SSL Support type "([^"]*)" for "([^"]*)" on port "([^"]*)"$`, cw.getSSLSupportReport)
	ctx.Step(`^"([^"]*)" contains details of SSL Support type "([^"]*)" for "([^"]*)" on port "([^"]*)" with STARTTLS$`, cw.getSSLSupportReportWithSTARTTLS)

	// Cloud API steps
	ctx.Step(`^a cloud api for "([^"]*)" in "([^"]*)"$`, cw.aCloudAPIForProviderIn)
	ctx.Step(`^I load environment variable "([^"]*)" as "([^"]*)"$`, cw.loadEnvironmentVariableAs)
	ctx.Step(`^I require environment variable "([^"]*)" as "([^"]*)"$`, cw.requireEnvironmentVariableAs)

	// Placeholder for scenarios with no concrete assertion yet
	ctx.Step(`^no-op required$`, cw.noOpRequired)
}

// noOpRequired is a placeholder step for scenarios that document controls without yet having a concrete test.
func (cw *CloudWorld) noOpRequired() error {
	return nil
}

// opensslClientRequest creates an OpenSSL s_client connection with optional TLS version
func (cw *CloudWorld) opensslClientRequest(tlsVersion, port, hostName, protocol string) error {
	tlsVersionResolved := cw.HandleResolve(tlsVersion)
	portResolved := cw.HandleResolve(port)
	hostResolved := cw.HandleResolve(hostName)
	protocolResolved := cw.HandleResolve(protocol)

	// Build openssl s_client command
	args := []string{"s_client", "-connect", fmt.Sprintf("%v:%v", hostResolved, portResolved), "-connect_timeout", "5"}

	// Add TLS version if specified
	if tlsVersionResolved != nil && fmt.Sprintf("%v", tlsVersionResolved) != "" {
		args = append(args, "-"+fmt.Sprintf("%v", tlsVersionResolved))
	}

	// Add STARTTLS if protocol is specified
	if protocolResolved != nil && fmt.Sprintf("%v", protocolResolved) != "" {
		args = append(args, "-starttls", fmt.Sprintf("%v", protocolResolved))
	}

	cmd := exec.Command("openssl", args...)

	// Create buffers for I/O
	inputBuffer := &bytes.Buffer{}
	outputBuffer := &bytes.Buffer{}

	// Get stdout pipe
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	// Get stderr pipe
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %v", err)
	}

	// Connect command's stdin to our input buffer
	cmd.Stdin = inputBuffer

	// Debug: Print the command being executed
	fmt.Printf("DEBUG: Executing: openssl %v\n", strings.Join(args, " "))

	// Start the command
	err = cmd.Start()
	if err != nil {
		return fmt.Errorf("failed to start command: %v", err)
	}

	// Create Connection object
	conn := &Connection{
		State:      "open",
		Input:      inputBuffer,
		Output:     "",
		cmd:        cmd,
		outputBuf:  outputBuffer,
		stopReader: make(chan struct{}),
	}

	// Start goroutines to read stdout and stderr
	conn.startOutputReader(stdout)
	conn.startOutputReader(stderr)

	// Monitor the command and set state to closed when it exits
	go func() {
		cmd.Wait()
		conn.stateMu.Lock()
		conn.State = "closed"
		conn.stateMu.Unlock()
		fmt.Printf("DEBUG: Command exited, connection state set to closed\n")
	}()

	cw.Props["result"] = conn
	fmt.Printf("DEBUG: Created connection with State=%v, stored in result\n", conn.State)
	return nil
}

// opensslClientRequestWithProtocol creates an OpenSSL s_client connection
func (cw *CloudWorld) opensslClientRequestWithProtocol(port, hostName, protocol string) error {
	return cw.opensslClientRequest("", port, hostName, protocol)
}

// opensslClientRequestWithTLSAndProtocol creates an OpenSSL s_client connection with specific TLS version
func (cw *CloudWorld) opensslClientRequestWithTLSAndProtocol(tlsVersion, port, hostName, protocol string) error {
	return cw.opensslClientRequest(tlsVersion, port, hostName, protocol)
}

// clientConnectsWithProtocol establishes a plain client connection to a host with a specific protocol
func (cw *CloudWorld) clientConnectsWithProtocol(hostName, protocol, port string) error {
	hostResolved := fmt.Sprintf("%v", cw.HandleResolve(hostName))
	portResolved := fmt.Sprintf("%v", cw.HandleResolve(port))

	// Use netcat for raw TCP connections (protocol-agnostic)
	cmd := exec.Command("nc", hostResolved, portResolved)

	// Create buffer for output
	outputBuffer := &bytes.Buffer{}

	// Get stdout pipe
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cw.Props["result"] = fmt.Errorf("failed to get stdout pipe: %v", err)
		return nil
	}

	// Connect command's stdin to our input buffer
	stdinPipe, err := cmd.StdinPipe()
	if err != nil {
		cw.Props["result"] = fmt.Errorf("failed to get stdin pipe: %v", err)
		return nil
	}

	fmt.Printf("DEBUG: Executing: nc %s %s\n", hostResolved, portResolved)

	// Start the command
	err = cmd.Start()
	if err != nil {
		cw.Props["result"] = fmt.Errorf("failed to start nc: %v", err)
		return nil
	}

	// Create Connection object
	conn := &Connection{
		State:      "open",
		Input:      stdinPipe,
		Output:     "",
		cmd:        cmd,
		outputBuf:  outputBuffer,
		stopReader: make(chan struct{}),
	}

	// Start goroutine to read stdout
	conn.startOutputReader(stdout)

	// Monitor the command and set state to closed when it exits
	go func() {
		cmd.Wait()
		conn.stateMu.Lock()
		conn.State = "closed"
		conn.stateMu.Unlock()
		fmt.Printf("DEBUG: nc exited, connection state set to closed\n")
	}()

	// Store in result
	cw.Props["result"] = conn
	fmt.Printf("DEBUG: Created nc connection with State=open, stored in result\n")

	return nil
}

// transmitToConnection sends data to a connection's input field
func (cw *CloudWorld) transmitToConnection(data, connectionName string) error {
	// Resolve the connection object
	connInterface := cw.HandleResolve(connectionName)
	if connInterface == nil {
		return fmt.Errorf("connection %s not found", connectionName)
	}

	conn, ok := connInterface.(*Connection)
	if !ok {
		return fmt.Errorf("%s is not a valid Connection object", connectionName)
	}

	if conn.Input == nil {
		return fmt.Errorf("connection has no writable input")
	}

	// Resolve any variables in the data string (e.g., {host-name})
	dataStr := fmt.Sprintf("%v", cw.HandleResolve(data))
	// Handle escape sequences for HTTP requests
	dataStr = strings.ReplaceAll(dataStr, "\\r", "\r")
	dataStr = strings.ReplaceAll(dataStr, "\\n", "\n")

	fmt.Printf("DEBUG: Transmitting %d bytes to connection: %q\n", len(dataStr), dataStr)

	// Write to the connection's input
	_, err := conn.Input.Write([]byte(dataStr))
	if err != nil {
		return fmt.Errorf("failed to write to connection: %v", err)
	}

	// Give time for response to arrive
	time.Sleep(500 * time.Millisecond)

	// Update Output from the buffer
	conn.mu.Lock()
	conn.Output = conn.outputBuf.String()
	conn.mu.Unlock()

	fmt.Printf("DEBUG: Output now contains %d bytes\n", len(conn.Output))
	return nil
}

// closeConnection closes an established connection
func (cw *CloudWorld) closeConnection(connectionName string) error {
	// HandleResolve will resolve "{connection}" to the actual Connection object
	connInterface := cw.HandleResolve(connectionName)
	if connInterface == nil {
		return fmt.Errorf("connection %s not found", connectionName)
	}

	// Type assert to Connection
	if conn, ok := connInterface.(*Connection); ok {
		conn.Close()
	} else {
		return fmt.Errorf("connection %s is not a valid Connection object", connectionName)
	}

	return nil
}

// checkConnectionState verifies that a connection has the expected state
func (cw *CloudWorld) checkConnectionState(connectionName, expectedState string) error {
	// HandleResolve will resolve "{connection}" to the actual Connection object
	connInterface := cw.HandleResolve(connectionName)
	if connInterface == nil {
		return fmt.Errorf("connection %s not found", connectionName)
	}

	// Type assert to Connection
	conn, ok := connInterface.(*Connection)
	if !ok {
		return fmt.Errorf("connection %s is not a valid Connection object", connectionName)
	}

	// Thread-safe state access
	currentState := conn.GetState()
	if currentState != expectedState {
		return fmt.Errorf("connection %s state is %s, expected %s", connectionName, currentState, expectedState)
	}

	return nil
}

// runTestSSL is a helper function to run testssl.sh and return JSON report
func (cw *CloudWorld) runTestSSL(reportName, testType, hostName, port string, useSTARTTLS bool) error {
	reportNameResolved := cw.HandleResolve(reportName)
	testTypeResolved := cw.HandleResolve(testType)
	hostResolved := cw.HandleResolve(hostName)
	portResolved := cw.HandleResolve(port)

	// Create temporary file for JSON output
	tempFile := fmt.Sprintf("/tmp/testssl_%v_%v_%v", testTypeResolved, hostResolved, portResolved)
	if useSTARTTLS {
		tempFile += "_starttls"
	}
	tempFile += ".json"

	// Build testssl.sh command
	// Try system-installed testssl.sh first, fall back to local copy
	testsslPath := "testssl.sh" // Use PATH lookup
	if _, err := exec.LookPath("testssl.sh"); err != nil {
		// Fall back to local copy
		_, filename, _, _ := runtime.Caller(0)
		cloudDir := filepath.Dir(filename)
		testsslPath = filepath.Join(cloudDir, "testssl.sh")
	}

	args := []string{
		testsslPath,
		"--" + fmt.Sprintf("%v", testTypeResolved),
		"--ip", "one", // Only test first IP to avoid scanning all IPs (e.g., S3 has 8)
	}

	if useSTARTTLS {
		// Determine STARTTLS protocol from port
		protocol := cw.HandleResolve("{protocol}")
		if protocol == nil {
			protocol = "smtp" // default
		}
		args = append(args, "-t", fmt.Sprintf("%v", protocol))
	}

	args = append(args, "--jsonfile", tempFile, fmt.Sprintf("%v:%v", hostResolved, portResolved))

	// Remove the temporary JSON file if it exists from a previous run
	os.Remove(tempFile)

	// Use Go context timeout (120 seconds) - vulnerable/server-defaults scans take longer
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "bash", args...)
	// Set process group so we can kill all children
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	// Debug: Print the command being executed
	fmt.Printf("DEBUG: Executing: bash %v\n", strings.Join(args, " "))

	_, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return fmt.Errorf("testssl.sh timed out")
	}
	if err != nil {
		// testssl.sh might return non-zero exit code even on success
		// Continue to try reading the JSON file
	}

	// Read and parse JSON output
	jsonData, err := os.ReadFile(tempFile)
	if err != nil {
		return fmt.Errorf("failed to read testssl.sh output: %v", err)
	}

	var report interface{}
	if err := json.Unmarshal(jsonData, &report); err != nil {
		return fmt.Errorf("failed to parse testssl.sh JSON: %v", err)
	}

	cw.Props[fmt.Sprintf("%v", reportNameResolved)] = report

	// Attach the JSON report for viewing in test results
	attachmentName := fmt.Sprintf("testssl_%v_%v_%v.json", testTypeResolved, hostResolved, portResolved)
	if useSTARTTLS {
		attachmentName = fmt.Sprintf("testssl_%v_%v_%v_starttls.json", testTypeResolved, hostResolved, portResolved)
	}
	cw.Attach(attachmentName, "application/json", jsonData)

	return nil
}

// getSSLSupportReport runs testssl.sh and returns JSON report
func (cw *CloudWorld) getSSLSupportReport(reportName, testType, hostName, port string) error {
	return cw.runTestSSL(reportName, testType, hostName, port, false)
}

// getSSLSupportReportWithSTARTTLS runs testssl.sh with STARTTLS support
func (cw *CloudWorld) getSSLSupportReportWithSTARTTLS(reportName, testType, hostName, port string) error {
	return cw.runTestSSL(reportName, testType, hostName, port, true)
}

// aCloudAPIForProviderIn initializes a cloud API factory from the given instance.
// Example: Given a cloud api for "{Instance}" in "api"
func (cw *CloudWorld) aCloudAPIForProviderIn(instanceArg string, apiName string) error {
	resolved := cw.HandleResolve(instanceArg)
	cfg, ok := resolved.(types.Config)
	if !ok {
		return fmt.Errorf("expected Config for %q, got %T", instanceArg, resolved)
	}

	provider, err := cfg.Provider()
	if err != nil {
		return fmt.Errorf("unsupported cloud provider in config for %q: %w", instanceArg, err)
	}

	f, err := factory.NewFactory(provider, cfg)
	if err != nil {
		return fmt.Errorf("failed to create factory for %q: %w", instanceArg, err)
	}

	cw.Props[apiName] = f
	return nil
}

// loadEnvironmentVariableAs copies an OS env var into scenario Props under alias.
// Missing vars are stored as nil so feature assertions can decide strictness.
func (cw *CloudWorld) loadEnvironmentVariableAs(envKey string, alias string) error {
	key := strings.TrimSpace(envKey)
	propAlias := strings.TrimSpace(alias)
	if key == "" {
		return fmt.Errorf("environment variable key is required")
	}
	if propAlias == "" {
		return fmt.Errorf("alias is required")
	}

	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		cw.Props[propAlias] = nil
		return nil
	}
	cw.Props[propAlias] = value
	return nil
}

// requireEnvironmentVariableAs copies an OS env var into Props and fails if missing.
func (cw *CloudWorld) requireEnvironmentVariableAs(envKey string, alias string) error {
	if err := cw.loadEnvironmentVariableAs(envKey, alias); err != nil {
		return err
	}
	resolved := cw.HandleResolve("{" + strings.TrimSpace(alias) + "}")
	if resolved == nil || strings.TrimSpace(fmt.Sprintf("%v", resolved)) == "" {
		return fmt.Errorf("required environment variable %q is not set", strings.TrimSpace(envKey))
	}
	return nil
}
