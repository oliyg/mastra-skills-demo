<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport, getToolName, isToolUIPart } from 'ai'

// 使用 Chat 类创建聊天实例
const chat = new Chat({
  transport: new DefaultChatTransport({
    api: "http://localhost:4111/chat",
    prepareSendMessagesRequest({ messages }) {
      return {
        body: {
          messages,
        },
      };
    },
  }),
})

// 本地输入状态
const input = ref('')
const messagesEndRef = ref(null)

// 计算属性：获取消息列表
const messages = computed(() => chat.messages || [])
const isLoading = computed(() => chat.status === 'streaming' || chat.status === 'submitted')
const error = computed(() => chat.error)

// 自动滚动到底部
const scrollToBottom = () => {
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
}

// 监听消息变化，自动滚动
watch(messages, () => {
  nextTick(scrollToBottom)
}, { deep: true })

// 处理表单提交
const handleSubmit = (e) => {
  e?.preventDefault()
  if (!input.value.trim() || isLoading.value) return

  // 发送消息
  chat.sendMessage({ text: input.value })
  input.value = ''
}

// 获取状态文本
const getStatusText = (state) => {
  const statusMap = {
    'input-available': '等待确认',
    'streaming': '执行中',
    'submitted': '已提交',
    'output-available': '已完成',
    'error': '执行出错'
  }
  return statusMap[state] || state
}

// ========== Workspace 文件浏览器相关 ==========
const API_BASE = 'http://localhost:4111'  // Mastra API 没有 /api 前缀

// Workspace 信息
const workspaceInfo = ref(null)
const files = ref([])
const selectedFile = ref(null)
const fileContent = ref('')
const expandedDirs = ref(new Set())
const isLoadingFiles = ref(false)
const isLoadingContent = ref(false)
const filesError = ref('')
const contentError = ref('')

// 获取 workspace 信息
const fetchWorkspaceInfo = async () => {
  try {
    const response = await fetch(`${API_BASE}/workspace/info`)
    if (!response.ok) throw new Error('Failed to fetch workspace info')
    workspaceInfo.value = await response.json()
  } catch (err) {
    console.error('Failed to load workspace info:', err)
  }
}

// 获取文件列表
const fetchFiles = async () => {
  isLoadingFiles.value = true
  filesError.value = ''
  try {
    const response = await fetch(`${API_BASE}/workspace/fs/list?path=/&recursive=true`)
    if (!response.ok) throw new Error('Failed to fetch files')
    const data = await response.json()
    files.value = data.files || []
  } catch (err) {
    filesError.value = err.message
    console.error('Failed to load files:', err)
  } finally {
    isLoadingFiles.value = false
  }
}

// 读取文件内容
const readFile = async (path) => {
  isLoadingContent.value = true
  contentError.value = ''
  fileContent.value = ''
  try {
    const response = await fetch(`${API_BASE}/workspace/fs/read?path=${encodeURIComponent(path)}`)
    if (!response.ok) throw new Error('Failed to read file')
    const data = await response.json()
    fileContent.value = data.content
    selectedFile.value = path
  } catch (err) {
    contentError.value = err.message
    console.error('Failed to read file:', err)
  } finally {
    isLoadingContent.value = false
  }
}

// 切换目录展开/折叠
const toggleDir = (path) => {
  if (expandedDirs.value.has(path)) {
    expandedDirs.value.delete(path)
  } else {
    expandedDirs.value.add(path)
  }
}

// 检查目录是否展开
const isExpanded = (path) => expandedDirs.value.has(path)

// 构建文件树结构
const fileTree = computed(() => {
  const root = { name: '', path: '/', type: 'directory', children: [] }
  const pathMap = { '/': root }

  // 过滤掉没有 name 的无效文件，并确保路径以 / 开头
  // 同时提取纯净的文件名（去掉路径前缀）
  const validFiles = files.value
    .filter(file => file && typeof file.name === 'string')
    .map(file => {
      const path = file.path || file.name
      const fullPath = path.startsWith('/') ? path : '/' + path
      // 提取纯净的文件名（最后一个 / 后面的部分）
      const pureName = file.name.includes('/') 
        ? file.name.substring(file.name.lastIndexOf('/') + 1)
        : file.name
      return {
        ...file,
        path: fullPath,
        displayName: pureName
      }
    })

  // 首先创建所有目录节点
  validFiles.forEach(file => {
    if (file.type === 'directory') {
      pathMap[file.path] = {
        ...file,
        children: []
      }
    }
  })

  // 然后构建树结构
  validFiles.forEach(file => {
    const lastSlashIndex = file.path.lastIndexOf('/')
    // 处理根级路径（如 /skills），lastIndexOf('/') 返回 0，parentPath 应该是 '/'
    const parentPath = lastSlashIndex <= 0 ? '/' : file.path.substring(0, lastSlashIndex)
    const parent = pathMap[parentPath]
    if (parent) {
      if (file.type === 'directory') {
        if (pathMap[file.path] && !parent.children.find(c => c.path === file.path)) {
          parent.children.push(pathMap[file.path])
        }
      } else {
        // 避免重复添加
        if (!parent.children.find(c => c.path === file.path)) {
          parent.children.push(file)
        }
      }
    }
  })

  return root.children
})

// 获取文件图标
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const iconMap = {
    'js': '📜',
    'ts': '📘',
    'vue': '🟢',
    'json': '📋',
    'md': '📝',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'less': '🎨',
    'py': '🐍',
    'java': '☕',
    'go': '🔵',
    'rs': '🦀',
    'php': '🐘',
    'rb': '💎',
    'sh': '⚡',
    'bash': '⚡',
    'yml': '⚙️',
    'yaml': '⚙️',
    'xml': '📄',
    'sql': '🗄️',
    'dockerfile': '🐳',
    'gitignore': '🔒',
  }
  return iconMap[ext] || '📄'
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (bytes === undefined || bytes === null) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onMounted(() => {
  fetchWorkspaceInfo()
  fetchFiles()
})
</script>

<template>
  <div class="main-layout">
    <!-- 左侧聊天区域 (30%) -->
    <div class="left-panel">
      <div class="chat-container">
        <div class="messages-container">
          <div v-for="(message, index) in messages" :key="message.id || index"
            :class="['message', message.role === 'user' ? 'user-message' : 'ai-message']">
            <div class="message-avatar">
              {{ message.role === 'user' ? '我' : 'AI' }}
            </div>
            <div class="message-content">
              <div v-for="part in message.parts" :key="part.id" class="message-parts">
                <!-- Tool UI 卡片 -->
                <div v-if="isToolUIPart(part)" class="tool-card">
                  <!-- Tool 头部 -->
                  <div class="tool-header">
                    <div class="tool-icon-wrapper">
                      <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <div class="tool-info">
                      <div class="tool-name">{{ getToolName(part) }}</div>
                      <div class="tool-status" :class="part.state">
                        <span class="status-dot"></span>
                        {{ getStatusText(part.state) }}
                      </div>
                    </div>
                  </div>

                  <!-- Tool 内容区域 -->
                  <div class="tool-content">
                    <!-- 确认操作区域 -->
                    <!-- input streaming -->
                    <div v-if="part.state === 'input-streaming'">
                      <div style="max-height: 200px; overflow: auto;">{{ part }}</div>
                    </div>

                    <!-- input available -->
                    <div v-if="part.state === 'input-available'" class="tool-confirm">
                      <p class="confirm-text">🤔 需要您的确认才能继续操作</p>
                      <!-- list files -->
                      <div v-if="getToolName(part) === 'mastra_workspace_list_files'">
                        <div>将列出工作区中的 {{ part.input.path }} 所有文件和文件夹 {{ part.input.maxDepth }}</div>
                      </div>
                    </div>

                    <!-- 处理中状态 -->
                    <div v-else-if="part.state === 'streaming' || part.state === 'submitted'" class="tool-processing">
                      <div class="processing-spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                      </div>
                      <span class="processing-text">正在执行...</span>
                    </div>

                    <!-- 完成状态 -->
                    <div v-else-if="part.state === 'output-available'" class="tool-success">
                      <div v-if="getToolName(part) === 'mastra_workspace_write_file'">
                        <div>{{ part.output }}</div>
                      </div>
                      <div v-if="getToolName(part) === 'mastra_workspace_list_files'">
                        <div v-if="typeof part.output === 'object'">
                          <pre>{{ part.output.tree }}</pre>
                          <div>{{ part.output.summary }}</div>
                        </div>
                        <div v-else>{{ part.output }}</div>
                      </div>
                      <div v-if="getToolName(part) === 'mastra_workspace_read_file'">
                        <pre>{{ part.output.content }}</pre>
                        <div>{{ part.output.path }}</div>
                      </div>

                      <div class="success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                      <span class="success-text">执行完成</span>
                    </div>
                  </div>
                </div>

                <!-- 普通文本消息 -->
                <div v-else-if="part.type === 'text'" class="message-bubble">
                  {{ part.text }}
                </div>
              </div>
            </div>

          </div>

          <div v-if="isLoading" class="message ai-message loading">
            <div class="message-avatar">AI</div>
            <div class="message-bubble typing">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>

          <div v-if="error" class="error-message">
            <span class="error-icon">⚠️</span>
            {{ error.message || error }}
          </div>

          <div ref="messagesEndRef"></div>
        </div>

        <form @submit="handleSubmit" class="input-area">
          <div class="input-wrapper">
            <input v-model="input" type="text" placeholder="输入消息..." :disabled="isLoading" class="message-input" />
            <button type="submit" :disabled="isLoading || !input.trim()" class="send-button">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 右侧 Workspace 文件浏览器区域 (70%) -->
    <div class="right-panel">
      <div class="workspace-container">
        <!-- Workspace 信息头部 -->
        <div class="workspace-header">
          <div class="workspace-title">
            <span class="workspace-icon">📁</span>
            <span>Workspace</span>
          </div>
          <div v-if="workspaceInfo?.filesystem" class="workspace-info">
            <span class="info-item">{{ workspaceInfo.filesystem.id }}</span>
          </div>
        </div>

        <!-- 文件浏览器主体 -->
        <div class="workspace-body">
          <!-- 文件树区域 -->
          <div class="file-tree-panel">
            <div class="panel-header">
              <span class="panel-title">📂 文件列表</span>
              <button @click="fetchFiles" class="refresh-btn" title="刷新">
                🔄
              </button>
            </div>

            <div v-if="isLoadingFiles" class="loading-state">
              <div class="spinner"></div>
              <span>加载中...</span>
            </div>

            <div v-else-if="filesError" class="error-state">
              ⚠️ {{ filesError }}
            </div>

            <div v-else class="file-tree">
              <!-- 递归渲染文件树 -->
              <template v-for="item in fileTree" :key="item.path">
                <div class="file-tree-item" :class="{
                  'is-directory': item.type === 'directory',
                  'is-file': item.type === 'file',
                  'is-selected': selectedFile === item.path
                }" :style="{ paddingLeft: '8px' }">
                  <div class="file-item-content"
                    @click="item.type === 'directory' ? toggleDir(item.path) : readFile(item.path)">
                    <span class="file-icon">
                      {{ item.type === 'directory' ? (isExpanded(item.path) ? '📂' : '📁') : getFileIcon(item.displayName || item.name) }}
                    </span>
                    <span class="file-name">{{ item.displayName || item.name }}</span>
                    <span v-if="item.size" class="file-size">{{ formatSize(item.size) }}</span>
                  </div>

                  <!-- 递归渲染子目录 -->
                  <div v-if="item.type === 'directory' && isExpanded(item.path) && item.children?.length"
                    class="file-children">
                    <template v-for="child in item.children" :key="child.path">
                      <div class="file-tree-item" :class="{
                        'is-directory': child.type === 'directory',
                        'is-file': child.type === 'file',
                        'is-selected': selectedFile === child.path
                      }" :style="{ paddingLeft: '20px' }">
                        <div class="file-item-content"
                          @click="child.type === 'directory' ? toggleDir(child.path) : readFile(child.path)">
                          <span class="file-icon">
                            {{ child.type === 'directory' ? (isExpanded(child.path) ? '📂' : '📁') :
                              getFileIcon(child.displayName || child.name) }}
                          </span>
                          <span class="file-name">{{ child.displayName || child.name }}</span>
                          <span v-if="child.size" class="file-size">{{ formatSize(child.size) }}</span>
                        </div>

                        <!-- 第三层递归 -->
                        <div v-if="child.type === 'directory' && isExpanded(child.path) && child.children?.length"
                          class="file-children">
                          <template v-for="grandchild in child.children" :key="grandchild.path">
                            <div class="file-tree-item" :class="{
                              'is-directory': grandchild.type === 'directory',
                              'is-file': grandchild.type === 'file',
                              'is-selected': selectedFile === grandchild.path
                            }" :style="{ paddingLeft: '20px' }">
                              <div class="file-item-content"
                                @click="grandchild.type === 'directory' ? toggleDir(grandchild.path) : readFile(grandchild.path)">
                                <span class="file-icon">
                                  {{ grandchild.type === 'directory' ? (isExpanded(grandchild.path) ? '📂' : '📁') :
                                    getFileIcon(grandchild.displayName || grandchild.name) }}
                                </span>
                                <span class="file-name">{{ grandchild.displayName || grandchild.name }}</span>
                                <span v-if="grandchild.size" class="file-size">{{ formatSize(grandchild.size) }}</span>
                              </div>

                              <!-- 第四层递归 -->
                              <div
                                v-if="grandchild.type === 'directory' && isExpanded(grandchild.path) && grandchild.children?.length"
                                class="file-children">
                                <template v-for="greatgrandchild in grandchild.children" :key="greatgrandchild.path">
                                  <div class="file-tree-item" :class="{
                                    'is-directory': greatgrandchild.type === 'directory',
                                    'is-file': greatgrandchild.type === 'file',
                                    'is-selected': selectedFile === greatgrandchild.path
                                  }" :style="{ paddingLeft: '20px' }">
                                    <div class="file-item-content"
                                      @click="greatgrandchild.type === 'directory' ? toggleDir(greatgrandchild.path) : readFile(greatgrandchild.path)">
                                      <span class="file-icon">
                                        {{ greatgrandchild.type === 'directory' ? (isExpanded(greatgrandchild.path) ?
                                          '📂' : '📁') : getFileIcon(greatgrandchild.displayName || greatgrandchild.name) }}
                                      </span>
                                      <span class="file-name">{{ greatgrandchild.displayName || greatgrandchild.name }}</span>
                                      <span v-if="greatgrandchild.size" class="file-size">{{
                                        formatSize(greatgrandchild.size) }}</span>
                                    </div>
                                  </div>
                                </template>
                              </div>
                            </div>
                          </template>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 文件内容区域 -->
          <div class="file-content-panel">
            <div class="panel-header">
              <span class="panel-title">📝 文件内容</span>
              <span v-if="selectedFile" class="selected-file-path">{{ selectedFile }}</span>
            </div>

            <div v-if="isLoadingContent" class="loading-state">
              <div class="spinner"></div>
              <span>加载中...</span>
            </div>

            <div v-else-if="contentError" class="error-state">
              ⚠️ {{ contentError }}
            </div>

            <div v-else-if="selectedFile && fileContent" class="file-content">
              <pre><code>{{ fileContent }}</code></pre>
            </div>

            <div v-else class="empty-state">
              <div class="empty-icon">📄</div>
              <p>点击左侧文件查看内容</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 主布局 - 3:7 比例 */
.main-layout {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
}

/* 左侧聊天面板 - 30% */
.left-panel {
  width: 30%;
  min-width: 360px;
  max-width: 480px;
  padding: 16px;
  display: flex;
}

/* 右侧留白面板 - 70% */
.right-panel {
  flex: 1;
  padding: 16px;
  display: flex;
}

/* 聊天容器 */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* 消息区域 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 消息行 */
.message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 100%;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  flex-direction: row-reverse;
}

/* 消息内容容器 */
.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: calc(100% - 60px);
}

/* 头像 */
.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  background: #e3e8ee;
  color: #4a5568;
}

.user-message .message-avatar {
  background: #4f46e5;
  color: white;
}

.ai-message .message-avatar {
  background: #10b981;
  color: white;
}

/* 消息气泡 */
.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
}

.user-message .message-bubble {
  background: #4f46e5;
  color: white;
  border-bottom-right-radius: 6px;
}

.ai-message .message-bubble {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 6px;
}

/* 输入中动画 */
.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
}

.dot {
  width: 6px;
  height: 6px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {

  0%,
  60%,
  100% {
    transform: translateY(0);
  }

  30% {
    transform: translateY(-4px);
  }
}

/* 错误消息 */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  margin: 0 8px;
}

.error-icon {
  font-size: 16px;
}

/* 输入区域 */
.input-area {
  padding: 16px 20px;
  background: #fafafa;
  border-top: 1px solid #e5e7eb;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  background: white;
  border-radius: 24px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-wrapper:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.message-input {
  flex: 1;
  padding: 10px 14px;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
  color: #1f2937;
}

.message-input::placeholder {
  color: #9ca3af;
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.send-button:hover:not(:disabled) {
  background: #4338ca;
}

.send-button:active:not(:disabled) {
  transform: scale(0.95);
}

.send-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* 右侧占位区域 */
.placeholder-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  color: #9ca3af;
}

.placeholder-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.placeholder-subtext {
  font-size: 14px;
  opacity: 0.7;
}

/* 滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Tool 卡片样式 */
.tool-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  margin: 8px 0;
  max-width: 100%;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -2px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  animation: toolCardSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.08),
    0 4px 6px -4px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

@keyframes toolCardSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Tool 头部 */
.tool-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.tool-icon-wrapper {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  flex-shrink: 0;
}

.tool-icon {
  width: 22px;
  height: 22px;
  color: white;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
}

.tool-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #64748b;
  transition: all 0.3s ease;
}

.tool-status.input-available {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}

.tool-status.streaming,
.tool-status.submitted {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
}

.tool-status.output-available {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
}

.tool-status.error {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: statusPulse 2s infinite;
}

.tool-status.output-available .status-dot,
.tool-status.error .status-dot {
  animation: none;
}

@keyframes statusPulse {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

/* Tool 内容区域 */
.tool-content {
  min-height: 60px;
}

/* 确认操作区域 */
.tool-confirm {
  text-align: center;
  padding: 8px 4px;
}

.confirm-text {
  font-size: 14px;
  color: #475569;
  margin-bottom: 16px;
  font-weight: 500;
}

.confirm-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-confirm,
.btn-cancel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn-confirm {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.btn-confirm:active {
  transform: translateY(0);
}

.btn-cancel {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-cancel:hover {
  background: #e2e8f0;
  color: #475569;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.btn-cancel:active {
  transform: translateY(0);
}

.btn-confirm svg,
.btn-cancel svg {
  flex-shrink: 0;
}

/* 处理中状态 */
.tool-processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 12px;
}

.processing-spinner {
  position: relative;
  width: 40px;
  height: 40px;
}

.spinner-ring {
  position: absolute;
  border: 3px solid transparent;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-ring:nth-child(1) {
  width: 40px;
  height: 40px;
  top: 0;
  left: 0;
  animation-duration: 1s;
}

.spinner-ring:nth-child(2) {
  width: 28px;
  height: 28px;
  top: 6px;
  left: 6px;
  border-top-color: #8b5cf6;
  animation-duration: 0.8s;
  animation-direction: reverse;
}

.spinner-ring:nth-child(3) {
  width: 16px;
  height: 16px;
  top: 12px;
  left: 12px;
  border-top-color: #a78bfa;
  animation-duration: 0.6s;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.processing-text {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* 成功状态 */
.tool-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 10px;
  animation: successPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes successPopIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.success-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  animation: successCheck 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
}

.success-icon svg {
  width: 24px;
  height: 24px;
}

@keyframes successCheck {
  from {
    transform: scale(0) rotate(-45deg);
  }

  to {
    transform: scale(1) rotate(0);
  }
}

.success-text {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
}

/* 消息部分容器 */
.message-parts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ========== Workspace 文件浏览器样式 ========== */
.workspace-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.workspace-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

.workspace-icon {
  font-size: 24px;
}

.workspace-info {
  font-size: 12px;
  opacity: 0.9;
}

.info-item {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 12px;
}

.workspace-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 文件树面板 */
.file-tree-panel {
  width: 40%;
  min-width: 250px;
  max-width: 350px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.refresh-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #e5e7eb;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.file-tree-item {
  user-select: none;
}

.file-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 6px;
  margin: 0 4px;
}

.file-item-content:hover {
  background: #e5e7eb;
}

.file-tree-item.is-selected>.file-item-content {
  background: #dbeafe;
  color: #1e40af;
}

.file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 11px;
  color: #9ca3af;
  flex-shrink: 0;
}

.file-children {
  position: relative;
}

.file-children::before {
  content: '';
  position: absolute;
  left: 18px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #e5e7eb;
}

/* 文件内容面板 */
.file-content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.selected-file-path {
  font-size: 12px;
  color: #6b7280;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.file-content pre {
  margin: 0;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.file-content code {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
}

/* 状态样式 */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #9ca3af;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-state {
  color: #dc2626;
  text-align: center;
}

.empty-state .empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
  color: #9ca3af;
}

/* 滚动条样式 */
.file-tree::-webkit-scrollbar,
.file-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.file-tree::-webkit-scrollbar-track,
.file-content::-webkit-scrollbar-track {
  background: transparent;
}

.file-tree::-webkit-scrollbar-thumb,
.file-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.file-tree::-webkit-scrollbar-thumb:hover,
.file-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 响应式 */
@media (max-width: 900px) {
  .left-panel {
    width: 40%;
    min-width: 300px;
  }

  .file-tree-panel {
    width: 45%;
    min-width: 200px;
  }
}

@media (max-width: 640px) {
  .main-layout {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    max-width: none;
    height: 60vh;
    padding: 8px;
  }

  .right-panel {
    height: 40vh;
    padding: 8px;
  }

  .workspace-body {
    flex-direction: column;
  }

  .file-tree-panel {
    width: 100%;
    max-width: none;
    height: 40%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .file-content-panel {
    height: 60%;
  }
}
</style>
