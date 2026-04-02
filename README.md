# 校园能量优化器 (Campus Energy Optimizer)

## 项目概述

校园能量优化器是一个基于多智能体LLM的课程表优化决策系统，帮助学生在学术安全边界内最大化可用自由时间。

### 核心功能
- **智能课程表解析**: 支持图片截图和Excel文件导入
- **多智能体决策**: 学术守护者、时间最大化者、执行现实主义者三重评估  
- **灵活时间段表示**: 中文格式时间槽（如"第一.二节"）
- **风险感知规划**: 基于学期阶段和用户偏好的动态优化

## 文档结构

### 英文文档
- [架构文档](./docs/en/architecture/) - 系统架构和设计决策
- [技术规范](./docs/en/technical-specifications/) - 完整的技术规格说明  
- [开发过程](./docs/en/development-process/) - 按日期排序的开发交接记录
- [问题存档](./docs/en/issue-archive/) - 已解决/部分解决/未解决问题跟踪

### 中文文档  
- [架构文档](./docs/zh/architecture/) - 系统架构和设计决策（中文）
- [技术规范](./docs/zh/technical-specifications/) - 完整的技术规格说明（中文）
- [开发过程](./docs/zh/development-process/) - 按日期排序的开发交接记录（中文）
- [问题存档](./docs/zh/issue-archive/) - 已解决/部分解决/未解决问题跟踪（中文）

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的 API 密钥

# 3. 数据库初始化  
pnpm prisma generate
pnpm prisma db push

# 4. 启动开发服务器
pnpm dev
```

## 贡献指南

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何贡献代码和文档。

## 技术栈

- **前端框架**: Next.js 15 + React 19 (App Router)
- **后端语言**: TypeScript  
- **数据库**: SQLite via Prisma ORM
- **AI集成**: 多智能体LLM决策系统
- **观测工具**: Langfuse追踪

## 许可证

MIT License