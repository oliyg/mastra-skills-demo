## 1. Directory Structure

- [x] 1.1 Create `src/mastra/` directory under `apps/api/`
- [x] 1.2 Create `src/mastra/agents/` subdirectory
- [x] 1.3 Create `src/mastra/workflows/` subdirectory

## 2. Agent Implementation

- [x] 2.1 Create `src/mastra/agents/greeter.ts` with a basic greeter agent
- [x] 2.2 Configure agent with deepseek model using existing `@ai-sdk/deepseek` dependency
- [x] 2.3 Export agent from agents module

## 3. Workflow Implementation

- [x] 3.1 Create `src/mastra/workflows/simple-workflow.ts` with a 2-step sequential workflow
- [x] 3.2 Define workflow steps with proper input/output schemas
- [x] 3.3 Export workflow from workflows module

## 4. Server Configuration

- [x] 4.1 Create `src/mastra/index.ts` as the main entry point
- [x] 4.2 Initialize Mastra instance with registered agents and workflows
- [x] 4.3 Configure server to use PORT environment variable with fallback to 3001

## 5. Verification

- [x] 5.1 Run `mastra build` to verify TypeScript compilation
- [x] 5.2 Run `mastra dev` to verify server starts on port 3001
- [x] 5.3 Verify agent endpoint is accessible
- [x] 5.4 Verify workflow endpoint is accessible
