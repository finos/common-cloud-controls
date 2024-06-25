# Markdown Linting and Formatting - End User Guide

## Purpose

This document provides a comprehensive guide for contributors to install and configure `markdownlint-cli` and `prettier` in Visual Studio Code (VSCode). These tools are essential for maintaining consistent markdown formatting and ensuring adherence to markdown style guidelines in your project. By following this guide, you will be able to:

- Install `markdownlint-cli` and `prettier` as development dependencies in your project.
- Set up the necessary VSCode extensions for enhanced markdown editing.
- Reference configuration files for seamless integration with VSCode, ensuring that your markdown files are automatically linted and formatted.

## Prerequisites

Before you begin, please ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).

## Installation Steps

### Step 1: Installing Linter and Formatter

1. Open your terminal.
2. Navigate to your project directory.
3. Run the following commands to install `markdownlint-cli` and `prettier` as development dependencies:

   ```bash
   npm install -g markdownlint-cli prettier
   ```

### Step 2: Install VSCode Extensions

1. Open VSCode.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or by pressing `Ctrl+Shift+X`.
3. Search for and install the following extensions:
   - **Markdownlint** (by David Anson)
   - **Prettier - Code formatter** (by Prettier)

### Step 3: Configure `markdownlint` and `prettier`

## Configuring VSCode

### Reference Configuration Files in VSCode

1. Open the Command Palette by pressing `Ctrl+Shift+P`.
2. Type `Preferences: Open Settings (JSON)` and select it.
3. Add the following configurations to your `settings.json` file to reference your config files:

   ```json
   {
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "[markdown]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     },
     "markdownlint.config": {
       "extends": ".markdownlint.yaml"
     },
     "prettier.configPath": ".prettierrc"
   }
   ```

## Installation Verification

1. Open a Markdown file in your project.
2. Save the file to trigger `prettier` formatting.
3. Run the following command in your terminal to lint your Markdown files:

   ```bash
   markdownlint-cli '**/*.md' --config ./.config/.markdownlint.yaml
   ```

   > **NOTE**: Ensure there are no linting errors or warnings. If so, please reach out to the Delivery [WG].

Thanks for reading. At this point, you have now successfully installed and configured `markdownlint-cli` and `prettier` in VSCode.

If you have any issues, please do not hesistate to reach out to the Delivery WG for more assistance.
