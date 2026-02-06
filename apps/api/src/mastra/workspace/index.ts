import {
  Workspace,
  LocalFilesystem,
  LocalSandbox,
  WORKSPACE_TOOLS,
} from "@mastra/core/workspace";

let workspace: Workspace | null = null;

export interface WorkspaceConfig {
  basePath?: string;
  workingDirectory?: string;
  skills?: string[];
  enableTools?: boolean;
  requireApproval?: boolean;
}

export async function getWorkspace(
  config: WorkspaceConfig = {}
): Promise<Workspace> {
  if (workspace) {
    return workspace;
  }

  const {
    basePath = "./agent-workspace",
    workingDirectory = "./agent-workspace",
    skills = ["/skills"],
    enableTools = true,
    requireApproval = false,
  } = config;

  workspace = new Workspace({
    filesystem: new LocalFilesystem({ basePath }),
    sandbox: new LocalSandbox({ workingDirectory }),
    skills,
    tools: {
      // Global defaults
      enabled: enableTools,
      requireApproval,

      // Per-tool overrides
      [WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: {
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
        requireApproval: false,
        requireReadBeforeWrite: true,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
        enabled: false,
      },
      [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
        requireApproval: false,
      },
    },
  });

  await workspace.init();

  return workspace;
}

export { Workspace, LocalFilesystem, LocalSandbox, WORKSPACE_TOOLS } from "@mastra/core/workspace";
