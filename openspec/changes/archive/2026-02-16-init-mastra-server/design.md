## Context

The `apps/api` package is part of a monorepo with existing TypeScript and ESLint configurations. Mastra dependencies are already installed (`@mastra/core`, `mastra`). The project uses TypeScript with module type "module" (ES modules).

Current state:

- No `src/` directory exists under `apps/api/`
- Mastra CLI commands are already configured in package.json (`mastra build`, `mastra dev`)
- Dependencies are installed but no Mastra server implementation exists
- Port 3001 is available for the new server

## Goals / Non-Goals

**Goals:**

- Create a minimal, functional Mastra server with directory structure
- Initialize at least one agent and one workflow
- Configure server to run on port 3001
- Follow Mastra framework conventions and patterns
- Use existing TypeScript and build configuration

**Non-Goals:**

- Complex multi-agent orchestration
- External integrations (databases, message queues)
- Authentication/authorization
- Production deployment configuration
- Extensive workflow logic

## Decisions

### Decision: Directory Structure

**Choice**: Follow Mastra's recommended project structure

- `src/mastra/` - Main Mastra configuration
- `src/mastra/agents/` - Agent definitions
- `src/mastra/workflows/` - Workflow definitions
- `src/mastra/index.ts` - Server entry point

**Rationale**: Mastra CLI expects this structure for build and dev commands. Keeps Mastra-specific code organized and separate from other API code.

### Decision: Agent Implementation

**Choice**: Create a simple "greeter" agent using a basic LLM configuration

**Rationale**: Demonstrates agent setup without complex prompting. Can be extended later. Uses `@ai-sdk/deepseek` which is already a dependency.

### Decision: Workflow Implementation

**Choice**: Create a simple sequential workflow with 2 steps

**Rationale**: Shows workflow pattern without business logic complexity. Validates that the workflow engine is properly configured.

### Decision: Server Configuration

**Choice**: Use environment variable `PORT` with fallback to 3001

**Rationale**: Follows 12-factor app principles. Allows flexibility for different environments while defaulting to the required port.

### Decision: Entry Point

**Choice**: `src/mastra/index.ts` as the main entry point

**Rationale**: Aligns with Mastra CLI conventions. The `mastra dev` and `mastra build` commands look for this file.

## Risks / Trade-offs

**Risk**: Mastra framework is relatively new and APIs may change

- **Mitigation**: Pin to specific version (^1.4.0), review Mastra documentation for current patterns

**Risk**: Port 3001 may be in use in some environments

- **Mitigation**: Use PORT environment variable for override capability

**Risk**: TypeScript configuration conflicts with Mastra requirements

- **Mitigation**: Use existing tsconfig.json which already targets ES modules

## Migration Plan

N/A - This is a new feature addition, not a migration.

## Open Questions

None - Requirements are clear for this minimal implementation.
