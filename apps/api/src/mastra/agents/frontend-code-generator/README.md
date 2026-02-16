# Frontend Code Generator Agent

Mastra agent for generating standalone HTML files with Vue.js and TailwindCSS.

## Features

- Generates complete, standalone HTML5 documents
- Uses Vue.js 3 and TailwindCSS via CDN (only external resources allowed)
- All other resources (CSS, JS, fonts, images) are inlined
- Structured input/output with metadata
- No build tools required - runs directly in browser

## Usage

### Basic Example

```typescript
import { frontendCodeGeneratorAgent } from './agents/index.js';

const result = await frontendCodeGeneratorAgent.generate(
  JSON.stringify({
    requirement: 'Create a todo list app with add, delete, and mark complete functionality',
    options: {
      style: 'modern',
      complexity: 'medium',
    },
  })
);

const response = JSON.parse(result.text);
console.log(response.html); // The generated HTML code
console.log(response.metadata); // Metadata about the generation
```

### Input Format

```typescript
{
  requirement: string;           // User's description of what to build
  options?: {
    style?: "modern" | "minimalist" | "colorful";     // Visual style
    complexity?: "simple" | "medium" | "complex";     // Complexity level
  }
}
```

### Output Format

```typescript
{
  html: string;                  // Complete HTML document
  metadata: {
    title: string;               // Page title
    description: string;         // Page description
    tailwindVersion: string;     // TailwindCSS version used
    vueVersion: string;          // Vue.js version used
    estimatedComplexity: "simple" | "medium" | "complex";
    components: string[];        // List of components used
    generatedAt: string;         // ISO 8601 timestamp
  };
  success: true;
}
```

## Constraints

The generated HTML follows strict rules:

✅ **Allowed External Resources:**

- TailwindCSS CDN: `https://cdn.tailwindcss.com`
- Vue.js CDN: `https://unpkg.com/vue@3/dist/vue.global.js`

❌ **Prohibited:**

- External CSS files
- External JavaScript files (except Vue)
- External fonts (Google Fonts, etc.)
- External images (use base64 data URIs)
- External icon libraries (FontAwesome, etc.)

All custom styles and scripts are inlined in the HTML document.

## Style Options

- **modern**: Clean, professional design with subtle shadows and rounded corners
- **minimalist**: Maximum simplicity with limited colors
- **colorful**: Vibrant colors and playful elements

## Complexity Levels

- **simple**: Single component, basic interactivity (< 100 lines)
- **medium**: Multiple components, moderate state management (100-300 lines)
- **complex**: Rich interactions, advanced Vue features (> 300 lines)

## Examples

### Simple Button Component

```typescript
const input = {
  requirement: 'Create a styled button that shows an alert when clicked',
  options: { style: 'modern', complexity: 'simple' },
};
```

### Todo List App

```typescript
const input = {
  requirement: 'Create a todo list with add, complete, and delete functionality',
  options: { style: 'colorful', complexity: 'medium' },
};
```

### Dashboard

```typescript
const input = {
  requirement: 'Create an analytics dashboard with charts and data cards',
  options: { style: 'modern', complexity: 'complex' },
};
```
