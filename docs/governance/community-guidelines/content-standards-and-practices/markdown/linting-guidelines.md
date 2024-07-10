# Global Markdown Linting Guidelines

## Table of Contents

- [Introduction](#introduction)
- [Enabled Rules](#enabled-rules)
- [Disabled Rules](#disabled-rules)
- [Conclusion](#conclusion)

## Introduction

This document provides comprehensive rules and examples for creating well-structured and visually appealing Markdown documents. These guidelines are aligned with the rules enforced by `markdownlint-cli`, a tool that helps maintain clean Markdown syntax. Adhering to these guidelines will ensure consistency across all written content and enhance readability for everyone across all of the [WG]'s.

## Enabled Rules

This section of this document contains a list of rules that are enabled for this project with reference links to the original documentation.

- **[MD001/heading-increment](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md001)**: Heading levels should only increment by one level at a time.
- **[MD003/heading-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md003)**: Heading style should be consistent.
- **[MD004/ul-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md004)**: Unordered list style should be consistent.
- **[MD005/list-indent](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md005)**: Inconsistent indentation for list items at the same level.
- **[MD007/ul-indent](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md007)**: Unordered list indentation with specific configurations.
- **[MD009/no-trailing-spaces](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md009)**: Trailing spaces with specific configurations.
- **[MD010/no-hard-tabs](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md010)**: Hard tabs with specific configurations.
- **[MD011/no-reversed-links](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md011)**: Reversed link syntax.
- **[MD012/no-multiple-blanks](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md012)**: Multiple consecutive blank lines with a maximum of one.
- **[MD014/commands-show-output](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md014)**: Dollar signs used before commands without showing output.
- **[MD018/no-missing-space-atx](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md018)**: No space after hash on atx style heading.
- **[MD019/no-multiple-space-atx](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md019)**: Multiple spaces after hash on atx style heading.
- **[MD020/no-missing-space-closed-atx](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md020)**: No space inside hashes on closed atx style heading.
- **[MD021/no-multiple-space-closed-atx](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md021)**: Multiple spaces inside hashes on closed atx style heading.
- **[MD022/blanks-around-headings](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md022)**: Headings should be surrounded by blank lines with specific configurations.
- **[MD023/heading-start-left](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md023)**: Headings must start at the beginning of the line.
- **[MD024/no-duplicate-heading](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md024)**: Multiple headings with the same content, siblings only.
- **[MD025/single-title/single-h1](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md025)**: Multiple top-level headings in the same document with specific configurations.
- **[MD026/no-trailing-punctuation](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md026)**: Trailing punctuation in heading with specific punctuation characters.
- **[MD027/no-multiple-space-blockquote](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md027)**: Multiple spaces after blockquote symbol.
- **[MD028/no-blanks-blockquote](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md028)**: Blank line inside blockquote.
- **[MD029/ol-prefix](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md029)**: Ordered list item prefix with specific list style.
- **[MD030/list-marker-space](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md030)**: Spaces after list markers with specific configurations.
- **[MD031/blanks-around-fences](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md031)**: Fenced code blocks should be surrounded by blank lines with specific configurations.
- **[MD032/blanks-around-lists](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md032)**: Lists should be surrounded by blank lines.
- **[MD033/no-inline-html](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md033)**: Inline HTML with allowed elements.
- **[MD035/hr-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md035)**: Horizontal rule style should be consistent.
- **[MD036/no-emphasis-as-heading](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md036)**: Emphasis used instead of a heading with specific punctuation characters.
- **[MD037/no-space-in-emphasis](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md037)**: Spaces inside emphasis markers.
- **[MD038/no-space-in-code](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md038)**: Spaces inside code span elements.
- **[MD039/no-space-in-links](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md039)**: Spaces inside link text.
- **[MD040/fenced-code-language](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md040)**: Fenced code blocks should have a language specified with specific configurations.
- **[MD041/first-line-heading/first-line-h1](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md041)**: First line in a file should be a top-level heading with specific configurations.
- **[MD042/no-empty-links](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md042)**: No empty links.
- **[MD044/proper-names](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md044)**: Proper names should have the correct capitalization with specific configurations.
- **[MD045/no-alt-text](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md045)**: Images should have alternate text (alt text).
- **[MD046/code-block-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md046)**: Code block style should be consistent.
- **[MD047/single-trailing-newline](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md047)**: Files should end with a single newline character.
- **[MD048/code-fence-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md048)**: Code fence style should be consistent.
- **[MD049/emphasis-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md049)**: Emphasis style should be consistent.
- **[MD050/strong-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md050)**: Strong style should be consistent.
- **[MD051/link-fragments](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md051)**: Link fragments should be valid.
- **[MD052/reference-links-images](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md052)**: Reference links and images should use a label that is defined with specific configurations.
- **[MD053/link-image-reference-definitions](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md053)**: Link and image reference definitions should be needed with specific configurations.
- **[MD054/link-image-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md054)**: Link and image style with specific configurations.
- **[MD055/table-pipe-style](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md055)**: Table pipe style should be consistent.
- **[MD056/table-column-count](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md056)**: Table column count.

## Disabled Rules

- **[MD013/line-length](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md013)**: The restriction on line length is disabled.
- **[MD034/no-bare-urls](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md034)**: The restriction on using bare URLs is disabled.
- **[MD043/required-headings](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#md043)**: The requirement for a specific heading structure is disabled.

## Conclusion

Following these Markdown linting guidelines will help maintain a standard style across all our documents. Consistent formatting not only improves readability but also creates a professional appearance for all our communications. We encourage all contributors to adhere to these practices to ensure clarity and uniformity in our documentation.

[WG]: <../../community-groups.md#working-groups>