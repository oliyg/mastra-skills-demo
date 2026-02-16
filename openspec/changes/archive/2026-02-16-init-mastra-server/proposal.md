## Why

The apps/api package currently lacks a Mastra server implementation. We need to initialize a minimal Mastra server with workflow and agent capabilities to enable AI-powered features in the API layer.

## What Changes

- Create `src/` directory structure under `apps/api/`
- Initialize Mastra server with TypeScript configuration
- Configure basic workflow and agent capabilities
- Set server port to 3001
- Add necessary Mastra dependencies

## Capabilities

### New Capabilities

- `mastra-server`: Initialize Mastra server with core setup, agent, and workflow configuration

### Modified Capabilities

<!-- No existing capabilities modified -->

## Impact

- **Apps**: Affects `apps/api` package
- **Dependencies**: Adds `@mastra/core` and related Mastra packages
- **Configuration**: Updates port configuration to 3001
- **Build**: TypeScript compilation targets for Mastra
