# Global Markdown Formatting Guidelines

## Table of Contents

- [Introduction](#introduction)
- [Enabled Rules](#enabled-rules)
- [Disabled Rules](#disabled-rules)
- [Conclusion](#conclusion)

## Introduction

This document outlines the formatting guidelines for Markdown files. To maintain consistency and readability across all documentation, we use `prettier`, an opinionated code formatter that enforces a uniform style. Adhering to these guidelines will ensure consistency across all written content and enhance readability for everyone across all of the [WG]'s.

## Enabled Rules

This section of this document contains a list of rules that are enabled for this project with reference links to the original documentation.

- **[`printWidth`](https://prettier.io/docs/en/options.html#print-width)**: Set to 10000 (effectively disabling line wrapping).
- **[`tabWidth`](https://prettier.io/docs/en/options.html#tab-width)**: Default is 2 spaces.
- **[`useTabs`](https://prettier.io/docs/en/options.html#tabs)**: Default is `false` (spaces are used for indentation).
- **[`semi`](https://prettier.io/docs/en/options.html#semicolons)**: Default is `true` (statements end with a semicolon).
- **[`singleQuote`](https://prettier.io/docs/en/options.html#quotes)**: Default is `false` (double quotes are used).
- **[`trailingComma`](https://prettier.io/docs/en/options.html#trailing-commas)**: Default is `es5` (trailing commas are used where valid in ES5).
- **[`bracketSpacing`](https://prettier.io/docs/en/options.html#bracket-spacing)**: Default is `true` (spaces are added inside object literals).
- **[`jsxBracketSameLine`](https://prettier.io/docs/en/options.html#jsx-brackets)**: Default is `false` (JSX brackets are not placed on the same line).
- **[`arrowParens`](https://prettier.io/docs/en/options.html#arrow-function-parentheses)**: Default is `always` (parentheses are always used around arrow function parameters).
- **[`parser`](https://prettier.io/docs/en/options.html#parser)**: Set to `markdown` for `.md` files.
- **[`proseWrap`](https://prettier.io/docs/en/options.html#prose-wrap)**: Default is `preserve` (preserves the original wrapping in Markdown files).
- **[`endOfLine`](https://prettier.io/docs/en/options.html#end-of-line)**: Default is `lf` (line feed only).

## Disabled Rules

- **[`printWidth`](https://prettier.io/docs/en/options.html#print-width)**: The `printWidth` rule is set to `10000`, effectively disabling line wrapping.

## Conclusion

Adhering to these formatting guidelines and using `prettier` will help ensure that our Markdown documents are not only consistent but also maintain a high standard of quality and readability. Regular use of `prettier` will streamline the document creation process, making it easier for everyone to produce well-formatted documentation.

[WG]: ../../../community-groups.md#working-groups
