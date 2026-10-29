---
name: digiforce-portal-sdk
description: >-
  Knowledge base and operational guidelines for @digiforce/portal-sdk and Digiforce/NocoBase AI Portals.
  Covers architecture, Refine provider adapters, query filter operators, Vite pre-bundling debugging,
  multi-portal deployment, and backend alignment troubleshooting.
---

# Digiforce Portal SDK & Multi-Portal Development Skill

Hướng dẫn quy chuẩn và cẩm nang xử lý các lỗi thường gặp khi phát triển Portal trên nền tảng **@digiforce/portal-sdk**, **Refine** và **NocoBase/PostgreSQL**.

---

## 1. Bản đồ toán tử lọc (Filter Operator Mapping) & Lỗi ép kiểu Postgres

### Vấn đề: `invalid input syntax for type bigint: "[object Object]"`
- Khi Refine Client gửi filter kiểm tra `null` cho trường liên kết hoặc khóa ngoại (ví dụ: `parent_id`):
  ```ts
  {
    field: "parent_id",
    operator: "null",
    value: true
  }
  ```
- **Nguyên nhân**:
  Backend NocoBase / PostgreSQL **không tồn tại toán tử `$null`** trong danh mục toán tử cơ sở dữ liệu (`operators/index.ts`). Thay vào đó, NocoBase sử dụng toán tử **`$empty`** (xem `operators/empty.ts`) để sinh điều kiện `IS NULL` hoặc `[Op.is]: null`.
  Nếu SDK map sang `{ "$null": true }`, Sequelize sẽ coi đó là object raw value và cố ép kiểu vào cột BigInt dẫn tới crash SQL:
  ```
  invalid input syntax for type bigint: "[object Object]"
  ```

### Quy chuẩn cấu hình trong SDK (`sdk/src/data/index.ts`):
Luôn map toán tử `null` và `nnull` của Refine sang `$empty` và `$notEmpty`:
```ts
const operatorMap: Record<string, string> = {
  eq: '$eq',
  ne: '$ne',
  lt: '$lt',
  gt: '$gt',
  lte: '$lte',
  gte: '$gte',
  in: '$in',
  nin: '$notIn',
  contains: '$includes',
  containss: '$includes',
  startswith: '$startsWith',
  endswith: '$endsWith',
  null: '$empty',        // Quan trọng: Phải là $empty, KHÔNG dùng $null
  nnull: '$notEmpty',    // Quan trọng: Phải là $notEmpty, KHÔNG dùng $notNull
  between: '$between',
  nbetween: '$notBetween',
};
```
*Lưu ý: Sau khi sửa `sdk/src/data/index.ts`, phải chạy `pnpm --filter @digiforce/portal-sdk build` để cập nhật `sdk/dist/`.*

---

## 2. Multi-Portal Routing & Lỗi 404: "Portal is unavailable"

### Vấn đề: Request `roles:check` trả về `404 Portal is unavailable`
- **Nguyên nhân**:
  Header `x-portal: <name>` được tự động gửi kèm dựa trên cấu hình:
  ```env
  DIGIFORCE_PORTAL_BASE=/x/<name>/
  ```
  Middleware `requestedPortal` trên backend sẽ truy vấn bảng `multiPortals` theo `portalName = <name>`. Nếu portal chưa được khởi tạo hoặc đang ở trạng thái `enabled = false`, toàn bộ request bảo mật (`roles:check`) sẽ bị chặn với mã 404.

### Cách xử lý:
1. **Kiểm tra danh sách portal đã có trên backend**:
   ```bash
   curl -s "http://localhost:18118/api/multiPortals:list" -H "x-role: root"
   ```
2. **Nếu portal chưa tồn tại, tạo mới bằng API hoặc CLI**:
   ```bash
   curl -X POST "http://localhost:18118/api/multiPortals:create" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN>" \
     -H "x-role: root" \
     -d '{
       "portalName": "project",
       "title": "Project Portal",
       "enabled": true,
       "portalType": "ai",
       "routePath": "/x/project"
     }'
   ```

---

## 3. Khắc phục lỗi Vite Dynamic Import (`504 Outdated Optimize Dep`)

### Vấn đề:
Trình duyệt báo lỗi khi nạp lazy module (`dashboard.tsx`, `index.tsx`):
```
TypeError: Failed to fetch dynamically imported module: ...
```
Và request module trả về:
```http
HTTP/1.1 504 Outdated Optimize Dep
```

### Cách xử lý:
Lỗi xuất hiện khi dependencies trong `.vite/deps` bị lệch version/metadata sau khi cập nhật thư viện hoặc build lại SDK.
Chạy lại dev server với cờ xóa cache `--force`:
```bash
pnpm dev --force
```
Sau đó Hard Refresh trình duyệt (`Ctrl + Shift + R`).

---

## 4. Quy trình Deploy Portal (`dfx portal deploy`)

### Quy trình chuẩn bằng Digiforce CLI:
Digiforce cung cấp lệnh chuyên dụng để build và đóng gói Portal lên server backend:
```bash
# Đứng trong thư mục portal workspace
dfx portal deploy <portal-slug> --dir . --env default
```

**Các bước tự động thực hiện bởi lệnh trên**:
1. Chạy `pnpm build` (`tsc && refine build`).
2. Chạy `pnpm build:html`.
3. Đóng gói thư mục `dist/` thành file nén `tar.gz`.
4. Gọi API `/api/multiPortals:deploy?filterByTargetKey=<portal-slug>`.
5. Backend giải nén vào `storage/portals/main/<portal-slug>/dist/` và phục vụ trực tiếp qua:
   👉 `http://<domain>/x/<portal-slug>/`

### Tùy chọn `--skipBuild`:
Nếu đã build thủ công trước đó:
```bash
dfx portal deploy <portal-slug> --dir . --skipBuild
```
