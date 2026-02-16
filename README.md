# skills-mastra-workflow

Turborepo 项目，包含 Vue 3 前端和 Mastra 后端

## 项目结构

```
├── apps/
│   ├── web/           # Vue 3 + Vite + shadcn-vue 前端
│   └── api/           # Mastra + AI SDK 后端
├── packages/
│   ├── typescript-config/  # 共享 TypeScript 配置
│   ├── eslint-config/      # 共享 ESLint 配置
│   └── prettier-config/    # 共享 Prettier 配置
└── package.json
```

## 技术栈

### 前端 (apps/web)
- Vue 3 + TypeScript
- Vite
- Vue Router
- Pinia
- shadcn-vue + TailwindCSS
- TanStack Query Vue
- Axios
- Zod
- AI SDK Vue

### 后端 (apps/api)
- TypeScript
- Mastra
- AI SDK (DeepSeek)

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 端口

- 前端: http://localhost:3000
- 后端: http://localhost:3001

## 环境变量

复制 `.env.example` 到 `.env.local` 并填写相应配置。
