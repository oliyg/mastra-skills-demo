# Frontend Code Generator Workflow

A Mastra workflow that generates Vue 3 + TailwindCSS frontend code based on user requirements. The workflow includes validation, retry logic, and file generation.

## Overview

This workflow automates the process of generating frontend code by:

1. **Collecting requirements** - Understanding user needs
2. **Clarifying details** - Confirming design specifications
3. **Generating code** - Using AI to create HTML/Vue code
4. **Validating HTML** - Checking syntax and security constraints
5. **Writing files** - Saving validated code to disk
6. **Notifying completion** - Returning results to the user

## Features

- **Vue 3 + TailwindCSS** - Generates modern, responsive frontend code
- **Security validation** - Ensures only allowed CDN resources are used
- **Retry logic** - Automatically retries failed generations (up to 3 times)
- **Skills integration** - Uses Mastra skills for enhanced capabilities
- **File persistence** - Saves generated code to workspace

## Usage

### Basic Example

```typescript
import { frontendCodegenWorkflow } from './workflows/frontend-codegen.js';

// Execute the workflow
const result = await frontendCodegenWorkflow.execute({
  requirement: 'Create a landing page for a coffee shop',
  outputDir: './workspace/frontend-codegen/outputs',
  maxRetries: 3,
});

console.log(result);
// {
//   success: true,
//   filePath: './workspace/frontend-codegen/outputs/2024-...-coffee-shop.html',
//   html: '<!DOCTYPE html>...',
//   attempts: 1,
//   details: {
//     title: 'Coffee Shop Landing Page',
//     description: 'Create a landing page for a coffee shop',
//     validationErrors: []
//   }
// }
```

### Input Parameters

```typescript
interface FrontendCodegenInput {
  requirement: string; // User's description of what they want
  outputDir?: string; // Output directory (default: './workspace/frontend-codegen/outputs')
  maxRetries?: number; // Maximum retry attempts (default: 3)
}
```

### Output Structure

```typescript
interface FrontendCodegenOutput {
  success: boolean; // Whether generation succeeded
  filePath?: string; // Path to generated file (if successful)
  html?: string; // Generated HTML content (if successful)
  error?: string; // Error message (if failed)
  attempts: number; // Number of attempts made
  details?: {
    title?: string;
    description?: string;
    validationErrors?: string[];
  };
}
```

## Example Use Cases

### 1. Landing Page

```typescript
const result = await frontendCodegenWorkflow.execute({
  requirement:
    'Create a modern landing page for a SaaS product with hero section, features grid, and pricing cards',
  outputDir: './workspace/frontend-codegen/outputs',
});
```

### 2. Dashboard

```typescript
const result = await frontendCodegenWorkflow.execute({
  requirement:
    'Create an analytics dashboard with sidebar navigation, metric cards, and a line chart using mock data',
});
```

### 3. Portfolio Website

```typescript
const result = await frontendCodegenWorkflow.execute({
  requirement: 'Create a personal portfolio with about section, projects grid, and contact form',
});
```

## Allowed Resources

The workflow strictly validates external resources. Only the following CDNs are allowed:

- **Vue 3**: `https://unpkg.com/vue@3/dist/vue.global.js`
- **TailwindCSS**: `https://cdn.tailwindcss.com`

Any other external resources (scripts, stylesheets, images, fonts) will cause validation to fail.

## Retry Logic

If HTML validation fails:

1. The workflow automatically retries code generation
2. Up to 3 attempts are made (configurable via `maxRetries`)
3. Validation errors are passed back to the agent to guide improvements
4. After 3 failed attempts, the workflow returns an error

## Error Handling

### Common Errors

| Error                        | Description                                 | Resolution                                  |
| ---------------------------- | ------------------------------------------- | ------------------------------------------- |
| `External resource detected` | HTML contains prohibited external resources | Agent will retry without external resources |
| `HTML validation failed`     | Syntax errors in generated HTML             | Agent will retry with corrected syntax      |
| `Failed to write file`       | File system error                           | Check permissions and disk space            |

### Error Response Example

```typescript
{
  success: false,
  error: 'HTML validation failed after 3 attempts',
  attempts: 3,
  details: {
    validationErrors: [
      'External script source detected: https://example.com/script.js',
      'External link href detected: https://example.com/style.css'
    ]
  }
}
```

## Architecture

### Workflow Steps

```
┌─────────────────────────────────────────────────────────┐
│ 1. Collect Requirement                                  │
│    - Normalize and extract user requirements            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Clarify Details                                      │
│    - Confirm design specifications                      │
│    - Set color scheme, layout, features                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Generate Code                                        │
│    - Call frontend-code-generator agent                 │
│    - Use DeepSeek model for code generation             │
│    - Apply Vue 3 + TailwindCSS constraints              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Validate HTML                                        │
│    - Check HTML syntax using html-validate              │
│    - Detect prohibited external resources               │
│    - Validate Vue 3 syntax (optional)                   │
└─────────────────────────────────────────────────────────┘
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
       ┌──────────────┐         ┌──────────────┐
       │ Validation   │         │ Validation   │
       │ Failed       │         │ Passed       │
       └──────┬───────┘         └──────┬───────┘
              │                        │
              ↓                        ↓
       ┌──────────────┐         ┌──────────────┐
       │ Retry (max   │         │ 5. Write File│
       │ 3 attempts)  │         │              │
       └──────────────┘         └──────┬───────┘
                                       ↓
                              ┌──────────────┐
                              │ 6. Notify    │
                              │ Completion   │
                              └──────────────┘
```

### Components

- **`frontend-codegen-workflow`** - Main workflow orchestrator
- **`frontend-code-generator-agent`** - AI agent for code generation
- **`html-validation-tools`** - HTML validation and security checking
- **`workspace-integration`** - File system operations and skills

## Testing

Run the test suite:

```bash
# Run all tests
npm run test

# Run specific test file
npx vitest run src/workflows/frontend-codegen.test.ts

# Run with coverage
npx vitest run --coverage
```

## Development

### Project Structure

```
apps/api/src/
├── workflows/
│   ├── frontend-codegen.ts          # Main workflow
│   └── frontend-codegen.test.ts     # Workflow tests
├── agents/
│   ├── frontend-code-generator.ts   # Code generation agent
│   └── frontend-code-generator.test.ts # Agent tests
├── tools/
│   ├── html-validator.ts            # HTML validation tool
│   └── html-validator.test.ts       # Validation tests
└── workspace/
    └── index.ts                     # Workspace configuration
```

### Adding New Features

1. **New Validation Rules**: Add patterns to `html-validator.ts`
2. **New Workflow Steps**: Extend `frontend-codegen.ts`
3. **New Agent Capabilities**: Update agent instructions in `frontend-code-generator.ts`

## Configuration

### Environment Variables

```bash
# DeepSeek API Key
DEEPSEEK_API_KEY=your-api-key-here
```

### Workspace Settings

The workflow uses Mastra workspace for file operations:

- **Base Path**: `./workspace/frontend-codegen`
- **Output Directory**: `./workspace/frontend-codegen/outputs`
- **Skills Directory**: `./skills`

## Troubleshooting

### Validation Keeps Failing

If the workflow repeatedly fails validation:

1. Check the `validationErrors` in the response
2. Review the allowed CDN resources
3. Ensure the agent is not generating prohibited content
4. Consider increasing `maxRetries` temporarily

### Files Not Being Created

1. Check write permissions on the output directory
2. Verify disk space availability
3. Ensure the output directory path is correct

### Agent Not Using Skills

1. Verify skills directory exists at `./skills`
2. Check that SKILL.md files are present
3. Review workspace configuration in `workspace/index.ts`

## License

MIT
