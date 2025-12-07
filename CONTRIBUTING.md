# Contributing Guide

Thank you for contributing to the Android Knowledge Base! This guide will help you add new content effectively.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a branch for your contribution
4. Make your changes
5. Test locally
6. Submit a pull request

## Adding New Content

### Step 1: Choose the Right Level

- **Beginner**: Fundamentals, basic concepts, introductory topics
- **Intermediate**: Building on basics, common patterns, practical applications
- **Advanced**: Complex topics, performance optimization, advanced patterns
- **Overachiever**: Cutting-edge techniques, custom implementations, case studies

### Step 2: Check for Existing Content

Before creating new content:

1. Search the knowledge base for similar topics
2. Run duplicate check: `npm run check-duplicates`
3. Review existing files to avoid duplication
4. If similar content exists, consider:
   - Updating the existing file
   - Creating a cross-reference
   - Merging content

### Step 3: Create the File

#### Naming Convention

- Format: `NN. Title.md`
- NN is zero-padded (01, 02, ..., 99, 100+)
- Title is short and descriptive
- Example: `01. Introduction to Android Architecture.md`

#### File Location

Place files in the appropriate level folder:
- `android/01_beginners/`
- `android/02_intermediate/`
- `android/03_advanced/`
- `android/04_overachiever/`

### Step 4: Write Frontmatter

Every file must include complete frontmatter:

```yaml
---
number: 1                    # Unique sequential number
title: "Your Title"          # Canonical title
slug: "your-slug"            # URL-safe identifier (lowercase, hyphens)
level: "beginner"            # beginner|intermediate|advanced|overachiever
tags: ["tag1", "tag2"]       # Array of relevant tags
prerequisites: [1, 2]        # File numbers or slugs of prerequisites
estimated_minutes: 30        # Reading time estimate
contributors: ["Your Name"]  # Array of contributor names
diagrams: []                 # Optional: paths to diagram files
examples: []                 # Optional: paths to example code
canonical_id: "android-01"   # Globally unique ID (format: knowledgebase-NN)
---
```

**Important**: 
- `canonical_id` must be globally unique
- `slug` must be unique within the knowledgebase
- Use the admin UI to check for duplicates before submitting

### Step 5: Write Content

Follow the content structure:

1. **Overview** (one paragraph)
   - Brief summary of the topic
   - Why it matters

2. **Deep Explanation** (multiple subsections)
   - Detailed explanation
   - Concepts broken down
   - Progressive complexity

3. **Diagrams**
   - Use Mermaid syntax in code blocks:
     ````markdown
     ```mermaid
     graph TB
         A[Start] --> B[End]
     ```
     ````
   - Or reference SVG/PNG files in `assets/diagrams/`

4. **Real Code Examples**
   - Kotlin code with syntax highlighting
   - Complete, runnable examples
   - Explanations of key parts

5. **Hard Use-Cases**
   - Real-world problems
   - Step-by-step solutions
   - Alternative approaches

6. **Edge Cases and Pitfalls**
   - Common mistakes
   - Gotchas
   - Best practices

7. **References and Further Reading**
   - Official documentation links
   - Related articles
   - External resources

8. **Quiz** (5 questions)
   - Multiple choice format
   - Clear correct answers
   - Explanations

9. **Related Topics**
   - Cross-links to related files
   - Prerequisites
   - Next steps

### Step 6: Validate

1. Check frontmatter:
   ```bash
   npm run check-duplicates
   ```

2. Test locally:
   ```bash
   npm run dev
   ```

3. Verify:
   - File appears in browse page
   - Content renders correctly
   - Diagrams display
   - Quiz works
   - Links are valid

### Step 7: Submit

1. Commit with descriptive message
2. Push to your fork
3. Create pull request with:
   - Description of changes
   - Screenshots if UI changes
   - Reference to related issues

## Content Quality Standards

### Writing Style

- Clear and concise
- Progressive complexity
- Practical examples
- Code-first approach
- Explain the "why" not just the "how"

### Code Examples

- Use Kotlin
- Include imports
- Add comments for clarity
- Show both correct and incorrect patterns
- Include unit tests when relevant

### Diagrams

- Use Mermaid for flowcharts, architecture diagrams
- Use SVG for complex diagrams
- Include captions
- Explain how to read the diagram

### Quizzes

- 5 questions minimum
- Multiple choice (A, B, C, D)
- One clearly correct answer
- Include explanations
- Test understanding, not memorization

## Review Process

1. Automated checks (linting, duplicate detection)
2. Content review (accuracy, completeness)
3. Technical review (code examples, diagrams)
4. Style review (formatting, consistency)

## Questions?

Open an issue or contact maintainers.


