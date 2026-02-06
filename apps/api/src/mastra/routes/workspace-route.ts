import { registerApiRoute } from "@mastra/core/server";
import { getWorkspace } from "../workspace";

/**
 * 示例: GET /workspace/info - 获取 workspace 信息
 */
export const workspaceInfo = registerApiRoute("/workspace/info", {
  method: "GET",
  openapi: {
    summary: "获取 workspace",
    description: "返回 workspace 信息",
    tags: ["ws"],
    responses: {
      200: {
        description: "成功返回 workspace 信息",
        content: {
          "application/json": {},
        },
      },
    },
  },
  handler: async (c) => {
    const workspace = await getWorkspace({
      basePath: "./workspace",
      workingDirectory: "./workspace",
      skills: ["/skills"],
    });

    const filesystemInfo = workspace.filesystem?.getInfo
      ? await workspace.filesystem.getInfo()
      : undefined;
    const sandboxInfo = workspace.sandbox?.getInfo
      ? await workspace.sandbox.getInfo()
      : undefined;

    const response = {
      filesystem: filesystemInfo,
      sandbox: sandboxInfo
        ? {
          ...sandboxInfo,
          createdAt: sandboxInfo.createdAt.toISOString(),
          lastUsedAt: sandboxInfo.lastUsedAt?.toISOString(),
          timeoutAt: sandboxInfo.timeoutAt?.toISOString(),
        }
        : undefined,
      hasSkills: !!workspace.skills,
    };

    return c.json(response);
  },
});

/**
 * 示例: GET /workspace/fs/read - 读取文件内容
 */
export const workspaceFilesystemRead = registerApiRoute(
  "/workspace/fs/read",
  {
    method: "GET",
    openapi: {
      summary: "读取文件内容",
      description: "返回指定文件的内容",
      tags: ["ws"],
      parameters: [
        {
          name: "path",
          in: "query",
          description: "文件路径（相对于 workspace 根目录）",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "encoding",
          in: "query",
          description: "文件编码，默认为 utf-8",
          schema: { type: "string", default: "utf-8" },
        },
      ],
      responses: {
        200: {
          description: "成功返回文件内容",
          content: {
            "application/json": {},
          },
        },
        404: {
          description: "文件不存在",
          content: {
            "application/json": {},
          },
        },
        500: {
          description: "读取失败或 filesystem 不可用",
          content: {
            "application/json": {},
          },
        },
      },
    },
    handler: async (c) => {
      const workspace = await getWorkspace({
        basePath: "./workspace",
        workingDirectory: "./workspace",
        skills: ["/skills"],
      });

      const path = c.req.query("path");
      const encoding = c.req.query("encoding") || "utf-8";

      if (!path) {
        return c.json({ error: "Path parameter is required" }, 400);
      }

      if (!workspace.filesystem?.readFile) {
        return c.json({ error: "Filesystem not available" }, 500);
      }

      try {
        const content = await workspace.filesystem.readFile(path, {
          encoding: encoding as BufferEncoding,
        });

        return c.json({
          path,
          content: content.toString(),
          encoding,
        });
      } catch (error: any) {
        if (
          error.message?.includes("not found") ||
          error.message?.includes("ENOENT")
        ) {
          return c.json(
            { error: "File not found", message: error.message },
            404,
          );
        }
        return c.json(
          { error: "Failed to read file", message: error.message },
          500,
        );
      }
    },
  },
);

/**
 * 示例: GET /workspace/fs/list - 获取 workspace 中的文件列表
 */
export const workspaceFilesystemList = registerApiRoute("/workspace/fs/list", {
  method: "GET",
  openapi: {
    summary: "获取 workspace 文件列表",
    description: "返回指定目录下的文件和文件夹列表",
    tags: ["ws"],
    parameters: [
      {
        name: "path",
        in: "query",
        description: "目录路径（相对于 workspace 根目录）",
        schema: { type: "string", default: "/" },
      },
      {
        name: "recursive",
        in: "query",
        description: "是否递归列出子目录",
        schema: { type: "boolean", default: false },
      },
    ],
    responses: {
      200: {
        description: "成功返回文件列表",
        content: {
          "application/json": {},
        },
      },
      404: {
        description: "目录不存在",
        content: {
          "application/json": {},
        },
      },
    },
  },
  handler: async (c) => {
    const workspace = await getWorkspace({
      basePath: "./workspace",
      workingDirectory: "./workspace",
      skills: ["/skills"],
    });

    const path = c.req.query("path") || "/";
    const recursive = c.req.query("recursive") === "true";

    if (!workspace.filesystem?.readdir) {
      return c.json({ error: "Filesystem not available" }, 500);
    }

    try {
      const files = await workspace.filesystem.readdir(path, {
        recursive,
      });

      return c.json({
        path,
        files,
      });
    } catch (error: any) {
      return c.json(
        { error: "Failed to list files", message: error.message },
        404,
      );
    }
  },
});
