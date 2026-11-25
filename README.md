# engineering-standards

Repo trung tâm chứa **luật chung cho mọi dự án**. Sửa luật ở đây một lần thì tất cả dự án đều được áp dụng.

```
dotnet/
  Directory.Build.Standards.props  # cảnh báo = lỗi, bật analyzer
  standards.globalconfig           # mức nghiêm trọng của từng luật CA
  BannedSymbols.txt                # API bị cấm (kèm lý do)
eslint/
  index.mjs                        # cấu hình ESLint chung cho Next.js
  plugin.mjs                       # luật tự viết (các góp ý review đã tự động hoá)
.github/workflows/
  dotnet-ci.yml                    # build + test API
  web-ci.yml                       # lint + typecheck + build web
  e2e.yml                          # dựng stack Docker, Playwright, video, đo CPU, đăng demo vào PR
org/
  ruleset-main.json                # luật merge áp cho mọi repo dự án
  ruleset-standards.json           # luật merge cho chính repo này + project-template (cần lead duyệt)
  slack-routing.example.yml        # map kênh Slack -> repo (nếu tự viết bot)
docs/
  REVIEW-TO-RULE.md                # quy trình biến góp ý thành luật
runner/
  may-toi-job-guard.sh             # hook cài trên máy deploy: chỉ cho chạy deploy.yml từ main
.github/CODEOWNERS                 # mọi file ở đây đều cần lead duyệt
```

## Dự án dùng repo này thế nào

- Repo này được gắn vào mỗi dự án dưới dạng **git submodule** tại thư mục `standards/`.
- `api/Directory.Build.props` import `standards/dotnet/...`; `web/eslint.config.mjs` import `standards/eslint/index.mjs`.
- CI của dự án gọi các workflow trong `.github/workflows/` của repo này.
- Dependabot tự mở PR cập nhật submodule mỗi khi luật ở đây thay đổi.

## Cài đặt (một lần)

1. **Settings → Actions → General → Access**: chọn *Accessible from repositories in the organization*, để các dự án gọi được workflow dùng chung.
2. Nếu repo này để **private**: tạo một fine-grained token (hoặc GitHub App) chỉ có quyền đọc repo này, rồi lưu thành org secret `STANDARDS_TOKEN`. Nếu để **public** (repo chỉ chứa luật, không có bí mật) thì không cần token.
