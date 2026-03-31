#!/bin/bash
# 启动校园能量优化器（清除代理环境变量版本）

# 保存原始环境变量（可选）
export ORIGINAL_HTTP_PROXY="$HTTP_PROXY"
export ORIGINAL_HTTPS_PROXY="$HTTPS_PROXY"

# 清除代理环境变量
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy NO_PROXY no_proxy

echo "已清除代理环境变量，启动应用..."
echo "LANGFUSE_SHALLOW_LOGGING=$(grep LANGFUSE_SHALLOW_LOGGING .env | cut -d'=' -f2)"

# 启动开发服务器
pnpm dev