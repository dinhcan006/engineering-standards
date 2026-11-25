#!/usr/bin/env bash
# =====================================================================
# Chốt chặn trên runner máy của tôi (job-started hook của GitHub Actions runner).
#
# Vì sao cần: CODEOWNERS chỉ chặn MERGE, không chặn PUSH NHÁNH. Ai có quyền ghi
# (kể cả agent) có thể push một nhánh chứa workflow mới với
# `runs-on: [self-hosted, may-toi]` và workflow đó sẽ chạy thẳng trên máy của tôi.
# Hook này chạy TRƯỚC mọi job trên runner; exit khác 0 => job bị huỷ.
# File nằm trên máy của tôi nên agent không sửa được.
#
# Cài đặt (làm một lần trên máy của tôi, xem HUONG-DAN.md bước 5):
#   sudo install -m 755 -o root may-toi-job-guard.sh /opt/actions-runner-hooks/may-toi-job-guard.sh
#   sudo install -m 644 -o root /dev/null /opt/actions-runner-hooks/deployers.txt   # 1 tên GitHub mỗi dòng
#   echo 'ACTIONS_RUNNER_HOOK_JOB_STARTED=/opt/actions-runner-hooks/may-toi-job-guard.sh' >> <thư-mục-runner>/.env
#   sudo ./svc.sh stop && sudo ./svc.sh start
#
# Chỉ cho phép: workflow .github/workflows/deploy.yml, lấy từ nhánh main,
# được kích hoạt bằng tay (workflow_dispatch), bởi người có tên trong deployers.txt.
# =====================================================================
set -euo pipefail

ALLOWED_WORKFLOW_PATH=".github/workflows/deploy.yml"
ALLOWED_REF="refs/heads/main"
DEPLOYERS_FILE="${MAY_TOI_DEPLOYERS_FILE:-/opt/actions-runner-hooks/deployers.txt}"

deny() {
  echo "::error::[may-toi-guard] Từ chối chạy job trên máy của tôi: $1"
  echo "[may-toi-guard] workflow_ref=${GITHUB_WORKFLOW_REF:-?} event=${GITHUB_EVENT_NAME:-?} actor=${GITHUB_ACTOR:-?} triggering_actor=${GITHUB_TRIGGERING_ACTOR:-?}"
  exit 1
}

# Ví dụ GITHUB_WORKFLOW_REF: acme/shop/.github/workflows/deploy.yml@refs/heads/main
WORKFLOW_REF="${GITHUB_WORKFLOW_REF:-}"
[[ -n "$WORKFLOW_REF" ]] || deny "thiếu GITHUB_WORKFLOW_REF"

REPO="${GITHUB_REPOSITORY:-}"
[[ -n "$REPO" ]] || deny "thiếu GITHUB_REPOSITORY"

EXPECTED="$REPO/$ALLOWED_WORKFLOW_PATH@$ALLOWED_REF"
[[ "$WORKFLOW_REF" == "$EXPECTED" ]] \
  || deny "chỉ chạy $ALLOWED_WORKFLOW_PATH từ nhánh main (nhận được: $WORKFLOW_REF)"

[[ "${GITHUB_EVENT_NAME:-}" == "workflow_dispatch" ]] \
  || deny "chỉ chấp nhận kích hoạt bằng tay (workflow_dispatch)"

[[ -r "$DEPLOYERS_FILE" ]] || deny "không đọc được danh sách người deploy: $DEPLOYERS_FILE"

is_deployer() {
  local who="$1"
  [[ -n "$who" ]] || return 1
  grep -vE '^\s*(#|$)' "$DEPLOYERS_FILE" | tr -d '\r' | awk '{$1=$1};1' | grep -Fxq -- "$who"
}

is_deployer "${GITHUB_ACTOR:-}" || deny "'${GITHUB_ACTOR:-}' không có trong $DEPLOYERS_FILE"
# Re-run: người bấm chạy lại (triggering_actor) có thể khác người kích hoạt ban đầu
is_deployer "${GITHUB_TRIGGERING_ACTOR:-${GITHUB_ACTOR:-}}" \
  || deny "'${GITHUB_TRIGGERING_ACTOR:-}' (người bấm chạy lại) không có trong $DEPLOYERS_FILE"

echo "[may-toi-guard] OK: $WORKFLOW_REF bởi ${GITHUB_TRIGGERING_ACTOR:-$GITHUB_ACTOR}"
