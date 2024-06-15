# Markdown Linting Guidelines

## Table of Contents

- [Introduction](#introduction)
- [Enabled Rules](#enabled-rules)
  - [General Rules](#general-rules)
  - [Lists](#lists)
  - [Links](#links)
  - [Images](#images)
  - [Code](#code)
  - [Tables](#tables)
- [Conclusion](#conclusion)

## Introduction

This document provides comprehensive rules and examples for creating well-structured and visually appealing Markdown documents. These guidelines are aligned with the rules enforced by `markdownlint-cli`, a tool that helps maintain clean Markdown syntax. Adhering to these guidelines will ensure consistency across all written content and enhance readability for everyone across all of the [WG].

## Enabled Rules

This section of this document contains a list of rules that are enabled for this project with reference links to the original documentation.

### General Rules

- **Trailing Spaces**: Eliminate trailing whitespace at the end of lines ([MD009](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md009)).
- **Empty Lines**: Remove multiple consecutive blank lines ([MD012](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md012)).
- **File Endings**: Ensure that Markdown files end with a single newline character ([MD047](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md047)).

### Headers

- **Incremental Headers**: Start with `#` (h1) and increase by only one level sequentially ([MD001](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md001)).
- **ATX Headers**: Use ATX-style headers (`# Header`) rather than Setext-style ([MD003](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md003)).
- **Header Consistency**: Use consistent style for all headers, including capitalization and punctuation ([MD018](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md018)).

### Lists

- **List Style**: Use hyphens (`-`) for unordered list items consistently ([MD004](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md004)).
- **List Indentation**: Indent list markers by two spaces for nested lists ([MD005](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md005)).
- **List Marker Spacing**: Ensure there is a space between the list marker and the text ([MD030](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md030)).

### Links

- **Reference Style**: Use consistent link labeling. Prefer reference-style links where feasible to keep the text more readable ([MD034](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md034)).
- **Link Validation**: Ensure all links are valid and lead to the intended destinations.

### Images

- **Alt Text**: Always include alt text for images to improve accessibility ([MD045](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md045)).
- **Consistency**: Use a consistent method for linking images, and ensure all image links are valid.

### Code

- **Code Blocks**: Use fenced code blocks with specified language for syntax highlighting ([MD040](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md040)).
- **Inline Code**: Use backticks for inline code, ensuring no unnecessary spaces are inside the backticks ([MD038](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md038)).

### Tables

- **Alignment**: Align columns properly in Markdown tables for readability.
- **Headers**: Ensure tables have headers and that they are formatted consistently ([MD035](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md035)).

## Disabled Rules

## Conclusion

Following these Markdown linting guidelines will help maintain a standard style across all our documents. Consistent formatting not only improves readability but also creates a professional appearance for all our communications. We encourage all contributors to adhere to these practices to ensure clarity and uniformity in our documentation.

[WG]: <../../community-groups.md#working-groups>
