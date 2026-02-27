import { LocalFilesystem, LocalSandbox, Workspace, WORKSPACE_TOOLS } from '@mastra/core/workspace';

const getWorkspacePath = () => {
  return process.env.MASTRA_WORKSPACE_PATH || './workspace';
};

let workspaceInstance: Workspace | null = null;
let readOnlyWorkspaceInstance: Workspace | null = null;

const createWorkspace = (): Workspace => {
  if (!workspaceInstance) {
    const workspacePath = getWorkspacePath();
    workspaceInstance = new Workspace({
      id: 'mastra-workspace',
      name: 'Mastra Workspace',
      filesystem: new LocalFilesystem({
        basePath: workspacePath,
        contained: true,
      }),
      sandbox: new LocalSandbox({
        workingDirectory: workspacePath,
      }),
    });
  }
  return workspaceInstance;
};

const createReadOnlyWorkspace = (): Workspace => {
  if (!readOnlyWorkspaceInstance) {
    const workspacePath = getWorkspacePath();
    readOnlyWorkspaceInstance = new Workspace({
      id: 'mastra-readonly-workspace',
      name: 'Mastra ReadOnly Workspace',
      filesystem: new LocalFilesystem({
        basePath: workspacePath,
        contained: true,
      }),
      // skills: ["./skills"],
      tools: {
        [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { enabled: false },
        [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: { enabled: false },
        [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { enabled: false },
        [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: { enabled: false },
      },
    });
  }
  return readOnlyWorkspaceInstance;
};

const initWorkspaces = async (): Promise<void> => {
  await createWorkspace().init();
  await createReadOnlyWorkspace().init();
};

export const workspace = createWorkspace();
export const readOnlyWorkspace = createReadOnlyWorkspace();

export { createReadOnlyWorkspace, createWorkspace, initWorkspaces };
