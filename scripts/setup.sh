#!/usr/bin/env bash
# 本地初始化：安装依赖、准备数据目录、复制后端环境变量样例。
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

command -v bun >/dev/null || { echo "需要 Bun ≥1.3：https://bun.sh"; exit 1; }
command -v pnpm >/dev/null || { echo "需要 pnpm 9"; exit 1; }

pnpm_version="$(pnpm --version)"
case "$pnpm_version" in
  9.*) ;;
  *)
    echo "需要 pnpm 9.x（package.json 锁定 pnpm@9.15.0），当前为 $pnpm_version。"
    echo "可改用：cd academic-paper-explorer && npx -y pnpm@9.15.0 install"
    exit 1
    ;;
esac

mkdir -p data

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "已创建 server/.env（可选：填入 SEMANTIC_SCHOLAR_API_KEY 提升速率限制）"
fi

(cd academic-paper-explorer && pnpm install)

# 后端根依赖（unpdf，用于 PDF 取文）；缺了它 server 会在读取 PDF 论文时失败。
bun install

echo "初始化完成。运行： bun run build:web && bun run server"
