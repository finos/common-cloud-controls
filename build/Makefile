SHELL:=/usr/bin/env bash

.PHONY: help
# Run "make" or "make help" to get a list of user targets
# Adapted from https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?##.*$$' $(MAKEFILE_LIST) | awk 'BEGIN { \
	 FS = ":.*?## "; \
	 printf "\033[1m%-30s\033[0m %s\n", "TARGET", "DESCRIPTION" \
	} \
	{ printf "\033[32m%-30s\033[0m %s\n", $$1, $$2 }'

.PHONY: all
all: install-tool validate ## Run installation and validation

.PHONY: clean-tool
clean-tool:  ## Remove oscal-cli tool instalation
	@echo Cleaning oscal-cli tool installation ...
	rm -frv $(OSCAL_CLI_INSTALL_PATH)

#
# Dependencies
#
OSCAL_CLI_VERSION:=1.0.3
OSCAL_CLI_BIN:=oscal-cli
OSCAL_CLI_INSTALL_URL:=https://repo1.maven.org/maven2/gov/nist/secauto/oscal/tools/oscal-cli/cli-core/$(OSCAL_CLI_VERSION)/cli-core-$(OSCAL_CLI_VERSION)-oscal-cli.zip
OSCAL_CLI_INSTALL_PATH:=./oscal-cli
$(OSCAL_CLI_INSTALL_PATH):
	@echo Downloading OSCAL CLI Tool...
	@mkdir -p $(OSCAL_CLI_INSTALL_PATH)
	@curl $(CURL_INSTALL_OPTS) -o $(OSCAL_CLI_INSTALL_PATH)/oscal-cli.zip $(OSCAL_CLI_INSTALL_URL)
	@unzip -o $(OSCAL_CLI_INSTALL_PATH)/oscal-cli.zip -d $(OSCAL_CLI_INSTALL_PATH)
	@chmod +x $(OSCAL_CLI_INSTALL_PATH)/bin/$(OSCAL_CLI_BIN)

CURL_INSTALL_OPTS:=--silent --location

SRC_DIR:=../src/oscal

.PHONY: install-tool
install-tool: $(OSCAL_CLI_INSTALL_PATH) ## Install oscal-cli tool

#
# Validate OSCAL examples with oscal-cli
#
.PHONY: validate
validate: $(OSCAL_CLI_INSTALL_PATH) ## Validate files by directory using OSCAL CLI Tool
	@find $(SRC_DIR)/examples -mindepth 1 -maxdepth 1 -type d | while read example_dir; do \
		example_type=$$(basename "$$example_dir"); \
		echo "Processing example type: $$example_type"; \
		find "$$example_dir" -name '*.*' | while read example_file; do \
			echo "Validating $$example_file with OSCAL CLI as $$example_type"; \
			$(OSCAL_CLI_INSTALL_PATH)/bin/oscal-cli "$$example_type" validate "$$example_file"; \
		done \
	done

