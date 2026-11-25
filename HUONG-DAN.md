# Bộ khung AI agent tự viết code: hướng dẫn cài đặt

Gồm 2 repo:

| Repo | Vai trò | Tạo mấy lần |
|---|---|---|
| `engineering-standards` | Luật chung: lint .NET và Next.js, API bị cấm, CI dùng chung, luật merge | **1 lần**, dùng cho mọi dự án |
| `project-template` | Khuôn dự án: CLAUDE.md, CODEOWNERS, CI, Docker, E2E, script khởi tạo | **1 lần**, mỗi dự án mới tạo từ đây |

```
Slack #proj-x ──► Agent (Claude Code / Cursor) ──► PR ──► CI: build, lint, test kiến trúc,
                                                          E2E + video + đo CPU
                                                            │
                     không chạm vùng bảo vệ ◄───────────────┴──────► chạm deploy/DB/CI
                     → tự merge                                      → lead duyệt
                                                                           │
                                       Deploy máy của tôi ◄── chỉ con người bấm ◄┘
```

---

## Cài đặt một lần (khoảng nửa ngày)

### 1. GitHub org
- Tạo team **`leads`** (những người được duyệt vùng bảo vệ).
- Tạo biến cấp org **`DEPLOYERS`** (Settings → Secrets and variables → Actions → Variables), giá trị dạng `["tenGithub1","tenGithub2"]`.

### 2. Repo `engineering-standards`
```bash
cd engineering-standards
grep -rl '__ORG__' . | xargs perl -pi -e 's/__ORG__/<ORG>/g'   # thay <ORG> bằng tên org thật (CODEOWNERS, ví dụ Slack)
git init && git add -A && git commit -m "chore: luật chung ban đầu"
gh repo create <ORG>/engineering-standards --public --source . --push
```
- Repo chỉ chứa luật, không có bí mật, nên để **public** là đơn giản nhất. Nếu muốn để private thì xem README trong repo (cần thêm `STANDARDS_TOKEN`).
- Settings → Actions → General → Access: chọn **Accessible from repositories in the organization**.

### 3. Repo `project-template`
```bash
cd project-template
grep -rl '__ORG__' . | xargs perl -pi -e 's/__ORG__/<ORG>/g'   # thay <ORG> bằng tên org thật
chmod +x scripts/*.sh
git init && git add -A && git commit -m "chore: template ban đầu"
gh repo create <ORG>/project-template --private --source . --push
gh repo edit <ORG>/project-template --template
```

### 4. Luật merge (ruleset)
Áp cho mọi repo trong org, kể cả repo tạo sau này:
```bash
gh api -X POST orgs/<ORG>/rulesets --input engineering-standards/org/ruleset-main.json
```
Nếu gói GitHub của bạn không hỗ trợ ruleset cấp org thì áp cho từng repo sau khi tạo:
```bash
jq 'del(.conditions.repository_name)' engineering-standards/org/ruleset-main.json \
  | gh api -X POST repos/<ORG>/<REPO>/rulesets --input -
```
Mẹo của ruleset này: **0 approval + bắt buộc code owner duyệt**. PR không chạm vùng CODEOWNERS sẽ tự merge khi CI xanh; PR chạm vùng đó phải chờ lead.

Ruleset trên **loại trừ** `engineering-standards` và `project-template`. Hai repo này cần ruleset riêng, chặt hơn: mọi thay đổi đều cần 1 lead duyệt, vì sửa luật ở đây là sửa luật của mọi dự án. Nếu không có ruleset này, ai có quyền ghi (kể cả agent) cũng push thẳng được vào `main`:
```bash
gh api -X POST orgs/<ORG>/rulesets --input engineering-standards/org/ruleset-standards.json
```

> **Lưu ý về danh tính của agent:** agent phải tạo PR bằng danh tính riêng (Claude GitHub App hoặc một tài khoản bot), **không** dùng tài khoản của lead. GitHub không cho tác giả tự duyệt PR của mình, nên PR do "chính lead" tạo mà chạm vùng bảo vệ sẽ kẹt vì không ai khác duyệt được.

### 5. Máy của tôi
- Cài GitHub Actions **self-hosted runner** với nhãn `may-toi` (Settings → Actions → Runners). Runner này chỉ dùng cho workflow deploy, **không bao giờ** chạy CI của PR.
- **Bắt buộc cài chốt chặn cho runner.** CODEOWNERS chỉ chặn *merge*, không chặn *push nhánh*. Bất kỳ ai có quyền ghi (kể cả agent) đều có thể push một nhánh chứa workflow mới với `runs-on: [self-hosted, may-toi]`, và workflow đó sẽ chạy thẳng trên máy của tôi. Hook `engineering-standards/runner/may-toi-job-guard.sh` chạy trước mọi job và chỉ cho qua `deploy.yml` lấy từ `main`, kích hoạt bằng tay, bởi người có tên trong danh sách:
  ```bash
  sudo mkdir -p /opt/actions-runner-hooks
  sudo install -m 755 -o root engineering-standards/runner/may-toi-job-guard.sh /opt/actions-runner-hooks/
  printf '%s
' tenGithub1 tenGithub2 | sudo tee /opt/actions-runner-hooks/deployers.txt   # trùng với biến DEPLOYERS
  echo 'ACTIONS_RUNNER_HOOK_JOB_STARTED=/opt/actions-runner-hooks/may-toi-job-guard.sh' >> <thư-mục-runner>/.env
  sudo ./svc.sh stop && sudo ./svc.sh start
  ```
  Nếu gói GitHub hỗ trợ, nên thêm một lớp nữa: đặt runner vào runner group riêng, chỉ cho phép các repo dự án và workflow `deploy.yml@refs/heads/main`.
- Mỗi repo dự án cần Environment **`production`**, chỉ cho deploy từ nhánh `main` (nên thêm Required reviewers là team `leads` nếu gói hỗ trợ). `init-project.sh` tự tạo environment này khi có `gh` với quyền admin; nếu không thì tạo tay trong Settings → Environments.
- Workflow deploy chỉ chấp nhận ref (nhánh, tag, commit) **đã được merge vào `main`**. Muốn rollback thì chọn commit hoặc tag cũ trên `main`.
- User chạy runner cần quyền dùng Docker (`usermod -aG docker <user>`).
- Mỗi dự án có một file bí mật: `/opt/apps/<slug>/.env` (connection string SQL Server, Redis, JWT...), `chmod 600`.
- Nginx: copy `deploy/nginx/<slug>.conf` của từng dự án vào `sites-enabled`, sau đó chạy `nginx -t && systemctl reload nginx` và certbot.

### 6. AI agent
- **Claude Code:** cài Claude GitHub App cho org (để agent tạo PR), và Claude app trong Slack (Claude Code in Slack). Cần gói Pro, Max hoặc Team có quyền dùng Claude Code.
- **Cursor (nếu dùng):** bật Cloud Agents, kết nối GitHub, **đặt hạn mức chi tiêu**.
- Cả hai đều tự đọc `CLAUDE.md`, `AGENTS.md` và `.cursor/rules` trong repo.

---

## Thêm dự án mới (khoảng 30–60 phút)

1. GitHub → `project-template` → **Use this template** → tạo repo mới.
2. Clone repo về, chạy `scripts/init-project.sh <TenDuAn> <slug>`, rồi `git push`.
3. Điền mục "Về dự án" trong `CLAUDE.md`.
4. Lấy một cặp port chưa dùng trong bảng dưới, sửa vào `deploy/deploy.env` và `deploy/nginx/<slug>.conf`.
5. Tạo kênh Slack `#proj-<slug>` và mời Claude vào kênh.
6. Tuần đầu: tạm tắt auto-merge, tự review PR của agent và **biến mỗi góp ý lặp lại thành luật** (`engineering-standards/docs/REVIEW-TO-RULE.md`). Khi thấy tin tưởng thì bật auto-merge.

### Bảng cấp port trên máy của tôi

| Dự án | Slug | API_PORT | WEB_PORT |
|---|---|---|---|
| _(dự án 1)_ | | 5100 | 3100 |
| _(dự án 2)_ | | 5110 | 3110 |
| _(dự án 3)_ | | 5120 | 3120 |

---

## Dự án cũ đã có sẵn code

Không dùng `init-project.sh`. Thay vào đó, làm thủ công:
1. `git submodule add https://github.com/<ORG>/engineering-standards.git standards`
2. Copy `CLAUDE.md`, `AGENTS.md`, `.cursor/`, `.github/`, `scripts/verify.sh`, `docker-compose.e2e.yml` từ template sang, rồi chỉnh cho khớp.
3. `api/Directory.Build.props`: import luật chung nhưng **tạm thời** đặt `<TreatWarningsAsErrors>false</TreatWarningsAsErrors>`. Giao agent sửa dần các cảnh báo, sạch rồi mới bật lại.
4. **Viết test E2E cho các luồng chính trước, rồi mới bật auto-merge.**

## Những gì chưa kiểm chứng trong môi trường tạo bộ khung

Bộ khung được viết trong môi trường không có .NET SDK và không có mạng. Các file đã qua kiểm tra cú pháp (YAML, JSON, bash, JavaScript, plugin ESLint). Riêng `init-project.sh` chưa chạy thật được. Lần đầu chạy, nếu analyzer .NET báo lỗi ở code mẫu do `dotnet new` sinh ra, chỉ cần tinh chỉnh `standards.globalconfig`.
