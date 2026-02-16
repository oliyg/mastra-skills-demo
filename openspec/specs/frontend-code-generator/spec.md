## ADDED Requirements

### Requirement: Agent accepts structured input

The agent SHALL accept a structured JSON input containing user requirement and optional configuration options.

#### Scenario: Valid input received

- **WHEN** the agent receives a request with `requirement` field containing user description
- **THEN** the agent SHALL process the request and generate HTML code

#### Scenario: Input with options

- **WHEN** the agent receives a request with both `requirement` and `options` fields
- **THEN** the agent SHALL respect the options (style, complexity) when generating code

### Requirement: Agent generates valid HTML output

The agent SHALL generate a complete, valid HTML5 document that can run directly in a browser without build tools.

#### Scenario: HTML structure validation

- **WHEN** the agent generates HTML code
- **THEN** the output SHALL contain valid HTML5 doctype
- **AND** SHALL contain `<html>`, `<head>`, and `<body>` tags
- **AND** SHALL be parseable by standard browsers

### Requirement: External resource restrictions

The generated HTML SHALL only reference TailwindCSS and Vue.js from external CDNs. All other resources MUST be inlined.

#### Scenario: Allowed external resources

- **WHEN** the agent generates HTML
- **THEN** it MAY include TailwindCSS CDN link: `https://cdn.tailwindcss.com`
- **AND** it MAY include Vue.js CDN link: `https://unpkg.com/vue@3/dist/vue.global.js`
- **AND** no other external `<script src="...">` tags SHALL be present

#### Scenario: Prohibited external resources

- **WHEN** the agent generates HTML
- **THEN** it SHALL NOT include external CSS files via `<link rel="stylesheet" href="...">` (except Tailwind)
- **AND** SHALL NOT include external fonts via Google Fonts or other CDNs
- **AND** SHALL NOT include external JavaScript libraries via CDN (except Vue.js)
- **AND** SHALL NOT reference external images via URL; all images MUST be inlined as base64 or data URIs

#### Scenario: Inline styles and scripts

- **WHEN** custom styles are needed
- **THEN** they SHALL be placed within `<style>` tags in the HTML head
- **WHEN** custom JavaScript is needed
- **THEN** it SHALL be placed within `<script>` tags, not in external files

### Requirement: Agent provides metadata in output

The agent SHALL return structured metadata alongside the generated HTML code.

#### Scenario: Metadata structure

- **WHEN** the agent successfully generates HTML
- **THEN** the output SHALL include `metadata` object containing:
  - `title`: brief title of the generated page
  - `description`: description of what the page does
  - `tailwindVersion`: version of TailwindCSS used
  - `vueVersion`: version of Vue.js used
  - `estimatedComplexity`: complexity level (simple/medium/complex)
  - `components`: list of Vue components or UI elements used
  - `generatedAt`: ISO 8601 timestamp of generation

### Requirement: Input validation

The agent SHALL validate input and reject invalid requests.

#### Scenario: Missing requirement field

- **WHEN** the agent receives input without `requirement` field
- **THEN** it SHALL return an error response indicating the missing field

#### Scenario: Invalid options

- **WHEN** the agent receives `options.style` with invalid value (not in allowed enum)
- **THEN** it SHALL either ignore the invalid option or return validation error

### Requirement: Output format consistency

The agent SHALL always return output in the defined structured format.

#### Scenario: Successful generation

- **WHEN** HTML generation succeeds
- **THEN** the response SHALL contain:
  - `html`: string containing the complete HTML document
  - `metadata`: object with required metadata fields
  - `success`: boolean set to `true`

#### Scenario: Failed generation

- **WHEN** HTML generation fails
- **THEN** the response SHALL contain:
  - `success`: boolean set to `false`
  - `error`: object containing error message and code
