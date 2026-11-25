# Biến góp ý review thành luật tự động

Nguyên tắc: **một lỗi chỉ được góp ý bằng lời đúng một lần.** Lần thứ hai gặp lại thì phải thành luật để máy tự bắt, và từ đó áp dụng cho mọi dự án.

## Chọn nơi đặt luật

| Loại lỗi | Đặt ở đâu | Ví dụ |
|---|---|---|
| Gọi một API/hàm cụ thể không nên dùng (C#) | `dotnet/BannedSymbols.txt` | `Task.Result`, `DateTime.Now`, `FromSqlRaw` |
| Một luật CA/IDE có sẵn của .NET | `dotnet/standards.globalconfig` (nâng lên `error`) | CA2016 quên truyền CancellationToken |
| Sai hướng phụ thuộc giữa các tầng | `api/tests/*ArchitectureTests` trong template | Domain gọi EF Core |
| Mẫu code sai trên web (React/Next.js) | `eslint/plugin.mjs` (rule mới) hoặc `eslint/index.mjs` | Đọc biến bí mật trong `"use client"` |
| Chậm, giật lag, tốn CPU/RAM | `web/e2e/budgets.ts` + test E2E | Trang tải quá 3 giây |
| Luồng nghiệp vụ bị hỏng | Test E2E Playwright trong dự án | Thanh toán không ra hoá đơn |

## Quy trình (khoảng 15–30 phút cho mỗi luật)

1. Ghi lại góp ý: lỗi gì, vì sao sai, cách đúng là gì.
2. Nhờ agent viết luật: *"Viết luật lint bắt lỗi X, kèm 1 ví dụ code vi phạm và 1 ví dụ code đúng để kiểm tra."*
3. Chạy luật trên các dự án hiện có. Nếu code cũ vi phạm quá nhiều thì để `warning` trước, cho agent sửa dần, rồi mới nâng lên `error`.
4. Merge vào `engineering-standards`. Dependabot sẽ tự mở PR cập nhật submodule `standards/` ở từng dự án.

## Ví dụ: chặn lỗi gây giật lag

Review phát hiện component gọi API trong `useEffect` thiếu dependency, khiến component render lặp vô hạn.
→ Đã có sẵn luật `react-hooks/exhaustive-deps`, chỉ cần nâng lên `error` trong `eslint/index.mjs`.
→ Thêm vào test E2E: đếm số request gọi tới API khi mở trang, vượt ngưỡng thì fail.

## Không được làm

- Không sửa luật chỉ để một PR qua được. Muốn đổi luật thì mở PR riêng vào repo này và nêu lý do.
- Agent không được tự sửa `standards/`, CODEOWNERS, CI hay `budgets.ts`. Các vùng này đều được bảo vệ bằng CODEOWNERS.
