# Markdown Formatting Guidelines

## Table of Contents

- [Introduction](#introduction)
- [General Formatting Rules](#general-formatting-rules)
- [Headers](#headers)
- [Emphasis](#emphasis)
- [Lists](#lists)
- [Links](#links)
- [Images](#images)
- [Code](#code)
- [Tables](#tables)
- [Conclusion](#conclusion)

## Introduction

This document outlines the formatting guidelines for Markdown files. To maintain consistency and readability across all documentation, we use `prettier`, an opinionated code formatter that enforces a uniform style.

## Enabled Rules

This section of this document contains a list of rules that are enabled for this project with reference links to the original documentation.

### General Formatting Rules

- **Line Width**: Keep the maximum line width to 80 characters where possible to improve readability.
- **Paragraphs**: Use a blank line between paragraphs to visually separate text blocks.

### Headers

Use headers to organize the document logically, using `#` for the main title down to `######` for smaller subsections.

```markdown
# H1 Main Title
## H2 Section Title
### H3 Subsection Title
#### H4 Further Subsection
##### H5
###### H6
```

### Emphasis

Emphasize text to make key information stand out.

```markdown
*italic* or _italic_
**bold** or __bold__
**_combined emphasis_**
```

### Lists

Organize items with bullet points or numbers for clarity.

```markdown
- Bullet point
- Another bullet point

1. Numbered item
2. Another numbered item
```

### Links

Include hyperlinks to external sources to enhance information.

```markdown
[OpenAI](https://www.openai.com)
```

### Images

Embed images to support textual content or provide visual representations.

```markdown
![Alt text for image](image-url.jpg)
```

### Code

Present code snippets clearly using fenced code blocks with specified languages.

```markdown
```javascript
console.log("Hello, world!");
```

### Tables

Use tables to organize data effectively.

```markdown
| Syntax    | Description |
| --------- | ----------- |
| Header    | Title       |
| Paragraph | Text        |
```

### Disabled Rules

TBD

## Conclusion

Adhering to these formatting guidelines and using `prettier` will help ensure that our Markdown documents are not only consistent but also maintain a high standard of quality and readability. Regular use of `prettier` will streamline the document creation process, making it easier for everyone to produce well-formatted documentation.
