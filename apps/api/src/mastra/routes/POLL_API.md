# 文件轮询与实时推送 API 文档

本文档介绍在聊天时如何实时同步文件列表和文件内容的接口。

## 接口概览

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 文件列表轮询 | GET | `/poll/files?path=/` | 短轮询 + ETag 缓存 |
| 文件内容轮询 | GET | `/poll/file/content?path=/xxx` | 短轮询 + ETag 缓存 |
| 文件列表 SSE | GET | `/sse/files?path=/` | **推荐**：Server-Sent Events 实时推送 |
| 文件内容 SSE | GET | `/sse/file/content?path=/xxx` | **推荐**：Server-Sent Events 实时推送 |
| 手动刷新 | POST | `/poll/refresh` | 触发主动检查 |

---

## 1. 短轮询 + ETag 方案

适用于简单场景，通过 HTTP 缓存减少不必要的传输。

### 1.1 文件列表轮询

```http
GET /poll/files?path=/skills&recursive=false
Headers:
  If-None-Match: "abc123"  # 可选，上次返回的 ETag
```

**响应：**

```http
HTTP/1.1 200 OK
ETag: "xyz789"
Cache-Control: no-cache

{
  "path": "/skills",
  "files": [
    { "name": "frontend-design", "type": "directory", "mtime": "..." },
    { "name": "README.md", "type": "file", "size": 1024, "mtime": "..." }
  ],
  "etag": "\"xyz789\"",
  "timestamp": 1707123456789
}
```

**304 响应（无变化）：**

```http
HTTP/1.1 304 Not Modified
```

### 1.2 文件内容轮询

```http
GET /poll/file/content?path=/skills/README.md
Headers:
  If-None-Match: "abc123"
```

**响应：**

```http
HTTP/1.1 200 OK
ETag: "content-hash-xyz"

{
  "path": "/skills/README.md",
  "content": "# 技能文档...",
  "etag": "\"content-hash-xyz\"",
  "mtime": "2024-01-15T10:30:00Z",
  "timestamp": 1707123456789
}
```

### 1.3 前端使用示例 (React Hook)

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';

// 文件列表轮询 Hook
function useFileListPoll(path: string, interval = 3000) {
  const [files, setFiles] = useState<any[]>([]);
  const [etag, setEtag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ requests: 0, cacheHits: 0 });
  const timerRef = useRef<NodeJS.Timeout>();

  const poll = useCallback(async () => {
    const headers: HeadersInit = etag ? { 'If-None-Match': etag } : {};
    
    const res = await fetch(`/poll/files?path=${encodeURIComponent(path)}`, { headers });
    setStats(s => ({ ...s, requests: s.requests + 1 }));

    if (res.status === 304) {
      setStats(s => ({ ...s, cacheHits: s.cacheHits + 1 }));
      return;
    }

    const data = await res.json();
    setEtag(data.etag);
    setFiles(data.files);
  }, [path, etag]);

  useEffect(() => {
    poll(); // 立即执行一次
    timerRef.current = setInterval(poll, interval);
    return () => clearInterval(timerRef.current);
  }, [poll, interval]);

  return { files, isLoading, stats, refresh: poll };
}

// 文件内容轮询 Hook
function useFileContentPoll(filePath: string | null, interval = 2000) {
  const [content, setContent] = useState('');
  const [etag, setEtag] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!filePath) return;

    const poll = async () => {
      const headers: HeadersInit = etag ? { 'If-None-Match': etag } : {};
      const res = await fetch(`/poll/file/content?path=${encodeURIComponent(filePath)}`, { headers });

      if (res.status === 304) return;

      const data = await res.json();
      
      if (etag && data.content !== content) {
        setIsModified(true); // 文件被外部修改
      }
      
      setEtag(data.etag);
      setContent(data.content);
    };

    poll();
    timerRef.current = setInterval(poll, interval);
    return () => clearInterval(timerRef.current);
  }, [filePath, interval]);

  return { content, setContent, isModified, setIsModified };
}

// 使用示例
function FileExplorer() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { files, stats } = useFileListPoll('/skills');
  const { content, setContent, isModified, setIsModified } = useFileContentPoll(selectedFile);

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* 文件列表 */}
      <div>
        <div>请求: {stats.requests} | 缓存: {stats.cacheHits}</div>
        {files.map(f => (
          <div key={f.name} onClick={() => setSelectedFile(`/skills/${f.name}`)}>
            {f.type === 'directory' ? '📁' : '📄'} {f.name}
          </div>
        ))}
      </div>

      {/* 文件编辑器 */}
      <div>
        {isModified && (
          <div style={{ background: '#fff3cd', padding: 10 }}>
            文件已被外部修改
            <button onClick={() => setIsModified(false)}>忽略</button>
          </div>
        )}
        <textarea 
          value={content} 
          onChange={e => setContent(e.target.value)}
          style={{ width: 500, height: 400 }}
        />
      </div>
    </div>
  );
}
```

---

## 2. SSE 实时推送方案（推荐）

使用 Server-Sent Events 实现真正的实时推送，减少不必要的请求，同时获得即时更新。

### 2.1 文件列表 SSE

```http
GET /sse/files?path=/skills&recursive=false
Accept: text/event-stream
```

**事件流：**

```
data: {"type":"filelist:init","path":"/skills","files":[...]}

data: {"type":"filelist:changed","path":"/skills","files":[...],"timestamp":1707123456789}

data: {"type":"filelist:changed","path":"/skills","files":[...],"timestamp":1707123460000}

: heartbeat

: heartbeat
```

### 2.2 文件内容 SSE

```http
GET /sse/file/content?path=/skills/README.md
Accept: text/event-stream
```

**事件流：**

```
data: {"type":"file:init","path":"/skills/README.md","content":"# 初始内容...","mtime":"..."}

data: {"type":"file:changed","path":"/skills/README.md","content":"# 更新后的内容...","timestamp":1707123456789}

: heartbeat
```

### 2.3 前端使用示例 (React Hook)

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';

// SSE 文件列表 Hook
function useFileListSSE(path: string) {
  const [files, setFiles] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({ messages: 0, updates: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = `/sse/files?path=${encodeURIComponent(path)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStats(s => ({ ...s, messages: s.messages + 1 }));

      if (data.type === 'filelist:init') {
        setFiles(data.data);
      } else if (data.type === 'filelist:changed') {
        setStats(s => ({ ...s, updates: s.updates + 1 }));
        setFiles(data.data);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      // 自动重连：浏览器会自动尝试重连
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [path]);

  return { files, isConnected, stats };
}

// SSE 文件内容 Hook
function useFileContentSSE(filePath: string | null) {
  const [content, setContent] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!filePath) return;

    const url = `/sse/file/content?path=${encodeURIComponent(filePath)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setIsModified(false);
    };

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'file:init') {
        setContent(data.content);
        setIsModified(false);
      } else if (data.type === 'file:changed') {
        // 如果用户正在编辑，提示冲突
        setPendingContent(data.content);
        setIsModified(true);
      }
    };

    es.onerror = () => setIsConnected(false);

    return () => es.close();
  }, [filePath]);

  const applyExternalChanges = useCallback(() => {
    if (pendingContent !== null) {
      setContent(pendingContent);
      setPendingContent(null);
      setIsModified(false);
    }
  }, [pendingContent]);

  const ignoreExternalChanges = useCallback(() => {
    setPendingContent(null);
    setIsModified(false);
  }, []);

  return {
    content,
    setContent,
    isConnected,
    isModified,
    applyExternalChanges,
    ignoreExternalChanges,
  };
}

// 使用示例
function ChatWithFileExplorer() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { files, isConnected: listConnected, stats } = useFileListSSE('/skills');
  const {
    content,
    setContent,
    isConnected: contentConnected,
    isModified,
    applyExternalChanges,
    ignoreExternalChanges,
  } = useFileContentSSE(selectedFile);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 1fr', gap: 20 }}>
      {/* 文件列表 */}
      <div>
        <h3>📁 文件列表</h3>
        <span style={{ color: listConnected ? 'green' : 'red' }}>
          {listConnected ? '●' : '○'} {listConnected ? '已连接' : '断开'}
        </span>
        <div>消息: {stats.messages} | 更新: {stats.updates}</div>
        
        {files.map(f => (
          <div 
            key={f.name} 
            onClick={() => setSelectedFile(`/skills/${f.name}`)}
            style={{ cursor: 'pointer', padding: 4 }}
          >
            {f.type === 'directory' ? '📁' : '📄'} {f.name}
          </div>
        ))}
      </div>

      {/* 编辑器 */}
      <div>
        <h3>📝 编辑器</h3>
        <span style={{ color: contentConnected ? 'green' : 'red' }}>
          {contentConnected ? '●' : '○'} {contentConnected ? '已连接' : '断开'}
        </span>
        
        {isModified && (
          <div style={{ background: '#fff3cd', padding: 10, margin: '10px 0' }}>
            <p>⚠️ 文件已被外部修改</p>
            <button onClick={applyExternalChanges}>重新加载</button>
            <button onClick={ignoreExternalChanges}>忽略</button>
          </div>
        )}
        
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ width: '100%', height: 400 }}
        />
      </div>

      {/* 聊天区域 */}
      <div>
        <h3>💬 聊天</h3>
        {/* 聊天组件 */}
        <div style={{ border: '1px solid #ccc', height: 400, padding: 10 }}>
          选中文件: {selectedFile || '无'}
        </div>
      </div>
    </div>
  );
}
```

---

## 3. 手动刷新接口

当需要主动触发文件检查时调用：

```http
POST /poll/refresh
Content-Type: application/json

{
  "path": "/skills",
  "type": "filelist"  // 或 "file"
}
```

**响应：**

```json
{
  "success": true,
  "type": "filelist",
  "path": "/skills"
}
```

---

## 4. 方案对比与选择建议

| 特性 | 短轮询 + ETag | SSE |
|------|---------------|-----|
| **实时性** | 有延迟（轮询间隔） | 即时推送 |
| **服务器压力** | 较高（频繁连接） | 较低（长连接） |
| **实现复杂度** | 简单 | 稍复杂 |
| **自动重连** | 需手动实现 | 浏览器自动支持 |
| **浏览器兼容** | 全部支持 | 现代浏览器 |
| **适用场景** | 低频更新、简单应用 | 聊天、协作编辑 |

### 推荐

- **聊天场景**：使用 **SSE**，确保文件列表和内容变化能即时反映到 UI
- **简单浏览**：使用 **短轮询 + ETag**，实现更简单
- **大规模部署**：SSE + Redis 缓存 ETag，减少文件系统压力

---

## 5. 调试工具

启动服务器后，访问示例页面：

```
http://localhost:4111/workspace/poll-examples.html
```

该页面展示了四种方案的实际效果，方便对比选择。
