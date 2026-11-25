// Cấu hình ESLint dùng chung cho mọi dự án Next.js.
// Dự án import: import companyRules from "../standards/eslint/index.mjs";
import company from "./plugin.mjs";

export default [
  {
    // Cấm mọi comment eslint-disable trong code: agent không thể tắt luật để PR qua.
    // Muốn ngoại lệ -> sửa cấu hình (vùng được bảo vệ, cần lead duyệt).
    linterOptions: {
      noInlineConfig: true,
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx,mjs}"],
    plugins: { company },
    rules: {
      "company/no-server-env-in-client": "error",
      "company/no-hardcoded-host": "error",

      // Hook thiếu dependency là nguồn gây render lặp / giật lag phổ biến nhất
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",

      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Không dùng dangerouslySetInnerHTML (nguy cơ XSS). Nếu bắt buộc, làm sạch HTML trong một component được duyệt.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["../../*"], message: "Dùng alias @/ thay cho đường dẫn tương đối sâu." },
          ],
        },
      ],
    },
  },
];
