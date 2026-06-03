#!/bin/bash
set -e
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/api-spec run codegen
