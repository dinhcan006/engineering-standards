// Plugin ESLint nội bộ: nơi chứa các "góp ý review đã được tự động hoá".
// Mỗi lần review phát hiện lỗi lặp lại trên web -> viết thêm 1 rule ở đây.
// Không phụ thuộc thư viện ngoài, để dự án nào cũng import được qua submodule.

const PUBLIC_ENV_PREFIX = "NEXT_PUBLIC_";
const ALLOWED_CLIENT_ENV = new Set(["NODE_ENV"]);

function hasUseClientDirective(ast) {
  for (const node of ast.body) {
    if (node.type !== "ExpressionStatement" || typeof node.directive !== "string") break;
    if (node.directive === "use client") return true;
  }
  return false;
}

/** Cấm đọc biến môi trường bí mật (không có tiền tố NEXT_PUBLIC_) trong Client Component. */
const noServerEnvInClient = {
  meta: {
    type: "problem",
    docs: { description: "Không đọc biến môi trường phía server trong file 'use client'" },
    messages: {
      leak:
        "process.env.{{name}} không dùng được trong Client Component (sẽ undefined hoặc lộ bí mật). " +
        "Đọc ở Server Component/route handler, hoặc đổi tên thành NEXT_PUBLIC_* nếu thật sự công khai.",
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    if (!hasUseClientDirective(sourceCode.ast)) return {};
    return {
      MemberExpression(node) {
        const obj = node.object;
        const isProcessEnv =
          obj.type === "MemberExpression" &&
          obj.object.type === "Identifier" &&
          obj.object.name === "process" &&
          obj.property.type === "Identifier" &&
          obj.property.name === "env";
        if (!isProcessEnv) return;
        let name = null;
        if (!node.computed && node.property.type === "Identifier") name = node.property.name;
        else if (node.property.type === "Literal") name = String(node.property.value);
        if (name && !name.startsWith(PUBLIC_ENV_PREFIX) && !ALLOWED_CLIENT_ENV.has(name)) {
          context.report({ node, messageId: "leak", data: { name } });
        }
      },
    };
  },
};

const HARDCODED_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i;

/** Cấm hard-code localhost / địa chỉ IP trong source code (gây lỗi khi deploy lên máy của tôi). */
const noHardcodedHost = {
  meta: {
    type: "problem",
    docs: { description: "Không hard-code localhost hoặc địa chỉ IP" },
    messages: {
      host: "Không hard-code '{{value}}'. Dùng biến cấu hình (NEXT_PUBLIC_API_URL / API_URL) qua src/lib/config.",
    },
    schema: [],
  },
  create(context) {
    const check = (node, value) => {
      if (typeof value === "string" && HARDCODED_HOST.test(value)) {
        context.report({ node, messageId: "host", data: { value } });
      }
    };
    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};

export default {
  meta: { name: "eslint-plugin-company", version: "1.0.0" },
  rules: {
    "no-server-env-in-client": noServerEnvInClient,
    "no-hardcoded-host": noHardcodedHost,
  },
};
