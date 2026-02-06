import { registerApiRoute } from "@mastra/core/server";
import { getWorkspace } from "../workspace";

// ==================== 类型定义 ====================

interface FileListCache {
  etag: string;
  data: any;
  timestamp: number;
}

interface FileContentCache {
  etag: string;
  content: string;
  timestamp: number;
}

// 内存缓存（生产环境建议使用 Redis）
const fileListCache = new Map<string, FileListCache>();
const fileContentCache = new Map<string, FileContentCache>();

// SSE 客户端管理
const sseClients = new Map<string, Set<{ send: (data: string) => void; close: () => void }>>();

// ==================== 辅助函数 ====================

/**
 * 生成 ETag（基于内容哈希）
 */
function generateETag(content: any): string {
  const str = JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${hash.toString(16)}"`;
}

/**
 * 计算文件列表的指纹（用于检测变化）
 */
async function getFileListFingerprint(files: any[]): Promise<string> {
  const simplified = files
    .map(f => ({
      name: f.name,
      type: f.type,
      mtime: f.mtime,
      size: f.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return generateETag(simplified);
}

/**
 * 通知所有订阅了文件列表的客户端
 */
function notifyFileListSubscribers(path: string, data: any) {
  const clients = sseClients.get(`list:${path}`);
  if (clients) {
    const message = JSON.stringify({
      type: "filelist:changed",
      path,
      timestamp: Date.now(),
      data,
    });
    clients.forEach(client => {
      try {
        client.send(message);
      } catch {
        // 忽略已断开的客户端
      }
    });
  }
}

/**
 * 通知所有订阅了文件内容的客户端
 */
function notifyFileContentSubscribers(path: string, content: string) {
  const clients = sseClients.get(`file:${path}`);
  if (clients) {
    const message = JSON.stringify({
      type: "file:changed",
      path,
      timestamp: Date.now(),
      content,
    });
    clients.forEach(client => {
      try {
        client.send(message);
      } catch {
        // 忽略已断开的客户端
      }
    });
  }
}

// ==================== 1. 短轮询 + ETag 接口 ====================

/**
 * GET /poll/files?path=/&recursive=false
 * 支持 ETag 缓存的文件列表轮询接口
 * 
 * 前端使用示例：
 * ```typescript
 * // 首次请求
 * const res = await fetch('/poll/files?path=/skills');
 * const etag = res.headers.get('ETag');
 * const data = await res.json();
 * 
 * // 后续轮询（带 ETag）
 * setInterval(async () => {
 *   const res = await fetch('/poll/files?path=/skills', {
 *     headers: { 'If-None-Match': etag }
 *   });
 *   if (res.status === 304) return; // 无变化
 *   const newData = await res.json();
 *   // 更新 UI...
 * }, 3000);
 * ```
 */
export const pollFileList = registerApiRoute("/poll/files", {
  method: "GET",
  openapi: {
    summary: "轮询文件列表（ETag 缓存）",
    description: "支持 ETag 缓存的文件列表轮询接口，文件无变化时返回 304",
    tags: ["poll"],
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
      200: { description: "文件列表有更新" },
      304: { description: "文件列表无变化（使用缓存）" },
      404: { description: "目录不存在" },
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
    const ifNoneMatch = c.req.header("If-None-Match");

    if (!workspace.filesystem?.readdir) {
      return c.json({ error: "Filesystem not available" }, 500);
    }

    try {
      const files = await workspace.filesystem.readdir(path, { recursive });
      const etag = await getFileListFingerprint(files);
      const cacheKey = `${path}:${recursive}`;

      // 如果 ETag 匹配，返回 304
      if (ifNoneMatch === etag) {
        return c.body(null, 304);
      }

      // 更新缓存
      fileListCache.set(cacheKey, {
        etag,
        data: files,
        timestamp: Date.now(),
      });

      // 检查是否真的变化了（用于触发 SSE 通知）
      const oldCache = fileListCache.get(cacheKey);
      if (oldCache && oldCache.etag !== etag) {
        notifyFileListSubscribers(path, files);
      }

      c.header("ETag", etag);
      c.header("Cache-Control", "no-cache");
      return c.json({
        path,
        files,
        etag,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      return c.json(
        { error: "Failed to list files", message: error.message },
        404
      );
    }
  },
});

/**
 * GET /poll/file/content?path=/skills/example.md
 * 支持 ETag 缓存的文件内容轮询接口
 * 
 * 前端使用示例：
 * ```typescript
 * // 首次请求
 * const res = await fetch('/poll/file/content?path=/skills/example.md');
 * const etag = res.headers.get('ETag');
 * const { content } = await res.json();
 * 
 * // 后续轮询（带 ETag）
 * setInterval(async () => {
 *   const res = await fetch('/poll/file/content?path=/skills/example.md', {
 *     headers: { 'If-None-Match': etag }
 *   });
 *   if (res.status === 304) return; // 无变化
 *   const newData = await res.json();
 *   // 更新编辑器内容...
 * }, 2000);
 * ```
 */
export const pollFileContent = registerApiRoute("/poll/file/content", {
  method: "GET",
  openapi: {
    summary: "轮询文件内容（ETag 缓存）",
    description: "支持 ETag 缓存的文件内容轮询接口，内容无变化时返回 304",
    tags: ["poll"],
    parameters: [
      {
        name: "path",
        in: "query",
        description: "文件路径（相对于 workspace 根目录）",
        required: true,
        schema: { type: "string" },
      },
    ],
    responses: {
      200: { description: "文件内容有更新" },
      304: { description: "文件内容无变化（使用缓存）" },
      404: { description: "文件不存在" },
    },
  },
  handler: async (c) => {
    const workspace = await getWorkspace({
      basePath: "./workspace",
      workingDirectory: "./workspace",
      skills: ["/skills"],
    });

    const path = c.req.query("path");
    const ifNoneMatch = c.req.header("If-None-Match");

    if (!path) {
      return c.json({ error: "Path parameter is required" }, 400);
    }

    if (!workspace.filesystem?.readFile) {
      return c.json({ error: "Filesystem not available" }, 500);
    }

    try {
      // 获取文件状态（包含 mtime）
      const stat = await workspace.filesystem.stat?.(path);
      const etag = generateETag({ path, mtime: stat?.mtime, size: stat?.size });

      // 如果 ETag 匹配，返回 304
      if (ifNoneMatch === etag) {
        return c.body(null, 304);
      }

      const content = await workspace.filesystem.readFile(path, {
        encoding: "utf-8",
      });

      // 更新缓存
      const oldCache = fileContentCache.get(path);
      fileContentCache.set(path, {
        etag,
        content: content.toString(),
        timestamp: Date.now(),
      });

      // 如果内容变化，触发 SSE 通知
      if (oldCache && oldCache.content !== content.toString()) {
        notifyFileContentSubscribers(path, content.toString());
      }

      c.header("ETag", etag);
      c.header("Cache-Control", "no-cache");
      return c.json({
        path,
        content: content.toString(),
        etag,
        mtime: stat?.mtime,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      if (
        error.message?.includes("not found") ||
        error.message?.includes("ENOENT")
      ) {
        return c.json(
          { error: "File not found", message: error.message },
          404
        );
      }
      return c.json(
        { error: "Failed to read file", message: error.message },
        500
      );
    }
  },
});

// ==================== 2. SSE 实时推送接口（推荐） ====================

/**
 * GET /sse/files?path=/
 * SSE 文件列表实时推送接口
 * 
 * 前端使用示例：
 * ```typescript
 * const eventSource = new EventSource('/sse/files?path=/skills');
 * 
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   if (data.type === 'filelist:changed') {
 *     // 更新文件列表 UI
 *     updateFileList(data.data);
 *   }
 * };
 * 
 * eventSource.onerror = () => {
 *   // 自动重连或提示用户
 * };
 * 
 * // 组件卸载时关闭
 * // eventSource.close();
 * ```
 */
export const sseFileList = registerApiRoute("/sse/files", {
  method: "GET",
  openapi: {
    summary: "SSE 文件列表实时推送",
    description: "使用 Server-Sent Events 实时推送文件列表变化",
    tags: ["sse"],
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
      200: { description: "SSE 连接建立成功" },
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
    const cacheKey = `list:${path}`;

    if (!workspace.filesystem?.readdir) {
      return c.json({ error: "Filesystem not available" }, 500);
    }

    // 设置 SSE 响应头
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // 发送消息的辅助函数
        const send = (data: string) => {
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            // 连接已关闭
          }
        };

        // 关闭连接的辅助函数
        const close = () => {
          try {
            controller.close();
          } catch {
            // 忽略错误
          }
        };

        // 注册客户端
        if (!sseClients.has(cacheKey)) {
          sseClients.set(cacheKey, new Set());
        }
        const clientSet = sseClients.get(cacheKey)!;
        const client = { send, close };
        clientSet.add(client);

        // 立即发送当前文件列表
        workspace.filesystem!
          .readdir(path, { recursive })
          .then((files) => {
            send(
              JSON.stringify({
                type: "filelist:init",
                path,
                timestamp: Date.now(),
                data: files,
              })
            );
          })
          .catch((error) => {
            send(
              JSON.stringify({
                type: "error",
                message: error.message,
              })
            );
          });

        // 心跳保持连接（每 30 秒）
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 30000);

        // 清理函数
        const cleanup = () => {
          clearInterval(heartbeat);
          clientSet.delete(client);
          if (clientSet.size === 0) {
            sseClients.delete(cacheKey);
          }
        };

        // 监听连接关闭
        // 注意：Hono 的 ReadableStream 关闭时会自动调用 cleanup
        // 这里用 setTimeout 模拟连接保持
        setTimeout(() => {
          cleanup();
          close();
        }, 3600000); // 1 小时后自动关闭
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
});

/**
 * GET /sse/file/content?path=/skills/example.md
 * SSE 文件内容实时推送接口
 * 
 * 前端使用示例：
 * ```typescript
 * const eventSource = new EventSource('/sse/file/content?path=/skills/example.md');
 * 
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   if (data.type === 'file:init') {
 *     // 初始化编辑器内容
 *     editor.setValue(data.content);
 *   } else if (data.type === 'file:changed') {
 *     // 文件被外部修改，提示用户或自动更新
 *     showNotification('文件已被修改，是否重新加载？');
 *   }
 * };
 * ```
 */
export const sseFileContent = registerApiRoute("/sse/file/content", {
  method: "GET",
  openapi: {
    summary: "SSE 文件内容实时推送",
    description: "使用 Server-Sent Events 实时推送文件内容变化",
    tags: ["sse"],
    parameters: [
      {
        name: "path",
        in: "query",
        description: "文件路径（相对于 workspace 根目录）",
        required: true,
        schema: { type: "string" },
      },
    ],
    responses: {
      200: { description: "SSE 连接建立成功" },
      404: { description: "文件不存在" },
    },
  },
  handler: async (c) => {
    const workspace = await getWorkspace({
      basePath: "./workspace",
      workingDirectory: "./workspace",
      skills: ["/skills"],
    });

    const path = c.req.query("path");
    const cacheKey = `file:${path}`;

    if (!path) {
      return c.json({ error: "Path parameter is required" }, 400);
    }

    if (!workspace.filesystem?.readFile) {
      return c.json({ error: "Filesystem not available" }, 500);
    }

    // 设置 SSE 响应头
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const send = (data: string) => {
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            // 连接已关闭
          }
        };

        const close = () => {
          try {
            controller.close();
          } catch {
            // 忽略错误
          }
        };

        // 注册客户端
        if (!sseClients.has(cacheKey)) {
          sseClients.set(cacheKey, new Set());
        }
        const clientSet = sseClients.get(cacheKey)!;
        const client = { send, close };
        clientSet.add(client);

        // 立即发送当前文件内容
        Promise.all([
          workspace.filesystem!.readFile(path, { encoding: "utf-8" }),
          workspace.filesystem!.stat?.(path),
        ])
          .then(([content, stat]) => {
            send(
              JSON.stringify({
                type: "file:init",
                path,
                timestamp: Date.now(),
                content: content.toString(),
                mtime: stat?.mtime,
              })
            );
          })
          .catch((error) => {
            send(
              JSON.stringify({
                type: "error",
                message: error.message,
              })
            );
            close();
          });

        // 心跳保持连接
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 30000);

        // 清理
        const cleanup = () => {
          clearInterval(heartbeat);
          clientSet.delete(client);
          if (clientSet.size === 0) {
            sseClients.delete(cacheKey);
          }
        };

        setTimeout(() => {
          cleanup();
          close();
        }, 3600000);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
});

// ==================== 3. WebSocket 升级接口（可选） ====================

/**
 * GET /ws/files
 * WebSocket 文件列表和内容实时推送（如需要双向通信）
 * 
 * 注意：Mastra/Hono 的 WebSocket 支持取决于服务器部署方式
 * 以下是概念实现，可能需要根据实际部署调整
 */
export const wsEndpoint = registerApiRoute("/ws/files", {
  method: "GET",
  openapi: {
    summary: "WebSocket 文件实时推送",
    description: "WebSocket 接口，支持双向实时通信",
    tags: ["ws"],
    responses: {
      200: { description: "WebSocket 升级成功" },
    },
  },
  handler: async (c) => {
    // WebSocket 升级处理
    // 具体实现取决于服务器环境（Node.js/Deno/Bun 等）
    const upgrade = c.req.header("Upgrade");
    if (upgrade !== "websocket") {
      return c.json({ error: "Expected WebSocket upgrade" }, 400);
    }

    // 返回 426 或让服务器中间件处理 WebSocket 升级
    return c.json(
      {
        message: "WebSocket endpoint available",
        note: "Implement WebSocket upgrade based on your server runtime",
      },
      200
    );
  },
});

// ==================== 4. 主动检查文件变化接口（用于触发推送） ====================

/**
 * POST /poll/refresh
 * 手动触发文件列表/内容检查（用于主动推送更新）
 * 
 * 前端使用示例：
 * ```typescript
 * // 用户点击刷新按钮时调用
 * await fetch('/poll/refresh', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ path: '/skills', type: 'filelist' })
 * });
 * ```
 */
export const refreshCheck = registerApiRoute("/poll/refresh", {
  method: "POST",
  openapi: {
    summary: "手动触发文件检查",
    description: "手动触发文件列表或内容的检查，用于主动推送更新",
    tags: ["poll"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              path: { type: "string" },
              type: { type: "string", enum: ["filelist", "file"] },
            },
          },
        },
      },
    },
    responses: {
      200: { description: "检查完成" },
    },
  },
  handler: async (c) => {
    const workspace = await getWorkspace({
      basePath: "./workspace",
      workingDirectory: "./workspace",
      skills: ["/skills"],
    });

    const body = await c.req.json();
    const { path, type = "filelist" } = body;

    if (type === "filelist") {
      try {
        const files = await workspace.filesystem!.readdir(path || "/", {
          recursive: false,
        });
        notifyFileListSubscribers(path || "/", files);
        return c.json({ success: true, type: "filelist", path });
      } catch (error: any) {
        return c.json(
          { success: false, error: error.message },
          500
        );
      }
    } else if (type === "file") {
      try {
        const content = await workspace.filesystem!.readFile(path, {
          encoding: "utf-8",
        });
        notifyFileContentSubscribers(path, content.toString());
        return c.json({ success: true, type: "file", path });
      } catch (error: any) {
        return c.json(
          { success: false, error: error.message },
          500
        );
      }
    }

    return c.json({ error: "Invalid type" }, 400);
  },
});
