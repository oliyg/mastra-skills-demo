<script setup>
import { ref, computed, watch, nextTick } from 'vue'
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

    <!-- 右侧留白区域 (70%) -->
    <div class="right-panel">
      <div class="placeholder-content">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
            <path d="M7 12h2v5H7zm4-3h2v8h-2zm4-2h2v10h-2z" />
          </svg>
        </div>
        <p class="placeholder-text">功能区域预留</p>
        <p class="placeholder-subtext">右侧区域等待后续开发</p>
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

/* 响应式 */
@media (max-width: 900px) {
  .left-panel {
    width: 40%;
    min-width: 300px;
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
}
</style>
