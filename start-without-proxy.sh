#!/bin/bash

# 临时禁用代理来访问 dashscope.aliyuncs.com API
echo "Bypassing proxy for dashscope.aliyuncs.com API access..."

HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= npm run dev