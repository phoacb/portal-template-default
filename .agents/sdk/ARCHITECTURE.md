# Digiforce Portal SDK (@digiforce/portal-sdk) - Tài liệu luồng & Architecture cho AI Agents

Tài liệu này cung cấp cái nhìn toàn diện, chuẩn xác và chi tiết về luồng kiến trúc, vòng đời ứng dụng và các hàm/lớp (functions/classes) trong `@digiforce/portal-sdk` (nằm tại thư mục `sdk/` trong template Portal). Tài liệu này được thiết kế nhằm giúp các AI Agent hiểu rõ cách thức hoạt động, luồng dữ liệu và quy tắc tương tác với SDK khi lập trình/nâng cấp/mở rộng hệ thống.

---

## 1. Tổng quan Kiến trúc SDK (Architecture Overview)

SDK `@digiforce/portal-sdk` đóng vai trò là tầng **Runtime & Core API Adapter** chuẩn hóa giữa **Digiforce / NocoBase Backend** và **Frontend React Application (sử dụng Refine Framework)**.

```
+-----------------------------------------------------------------------------------+
|                           Portal Application Host (React 19)                      |
| (UI / Shadcn Components / App Shell / Business Pages / Extensions / App.tsx)     |
+-----------------------------------------------------------------------------------+
                                        |
       +--------------------------------+--------------------------------+
       |                                |                                |
+------v--------------------+  +--------v-------------------+  +---------v----------+
|  Refine Providers Adapters|  | Application Routing & Life |  | State & Settings   |
| - authProvider            |  | - defineAppRoutes()        |  | - aclStore         |
| - dataProvider            |  | - renderAppRoutes()        |  | - SystemSettings   |
| - accessControlProvider   |  | - buildRouteResources()    |  | - i18nProvider     |
+---------------------------+  +----------------------------+  +--------------------+
       |                                |                                |
+------v--------------------------------v--------------------------------v----------+
|                        DigiforceClient & AuthSession                              |
| - DigiforceClient (fetch, CSRF, X-Role, X-Authenticator, X-With-ACL-Meta, stream) |
| - AuthSession (Token storage, Role, Locale, Multi-app namespace)                  |
| - WebSocketClient (Realtime & Auto Auth ping/reconnect)                           |
+-----------------------------------------------------------------------------------+
                                        |
                        +---------------v---------------+
                        |  Digiforce / NocoBase Backend |
                        |    (REST API & WebSocket)     |
                        +-------------------------------+
```

### Các Entry Points công khai (`exports`):
1. `@digiforce/portal-sdk/runtime`: Xác định base URL, API endpoint, app name, portal name và portal URLs.
2. `@digiforce/portal-sdk/client`: Instance HTTP client (`digiforceClient`), WebSocket client, session storage (`authSession`), chuẩn hóa lỗi runtime/HTTP.
3. `@digiforce/portal-sdk/auth`: Refine `authProvider`, cơ chế xác thực SSO/password/authenticator, token renew capture.
4. `@digiforce/portal-sdk/acl`: Phân quyền RBAC, kiểm tra quyền action/resource/record, `aclStore`, `accessControlProvider`, role switching.
5. `@digiforce/portal-sdk/data`: Refine `dataProvider`, chuyển đổi bộ lọc Refine sang cú pháp NocoBase (`$eq`, `$in`, `$includes`, `$empty`, `$notEmpty`,...), tự động cập nhật cache quyền record (`cacheAllowedActions`). Lưu ý: Toán tử `null`/`nnull` bắt buộc ánh xạ sang `$empty`/`$notEmpty` thay vì `$null` do Postgres/NocoBase backend không hỗ trợ `$null`.
6. `@digiforce/portal-sdk/routing`: Định nghĩa route (`defineAppRoutes`), compile sang Refine resources (`buildRouteResources`), render route có Guard/Suspense (`renderAppRoutes`).
7. `@digiforce/portal-sdk/extensions`: Cấu trúc plugin/extension runtime (`AppExtension`), thu thập và sắp xếp theo priority (`collectAppExtensionContributions`).
8. `@digiforce/portal-sdk/system-settings`: Cache cấu hình hệ thống từ backend (`loadSystemSettings`, `SystemSettingsProvider`).
9. `@digiforce/portal-sdk/i18n`: Quản lý ngôn ngữ, nạp resource bản dịch và adapter i18next cho Refine.
10. `@digiforce/portal-sdk/vite`: Plugin kiểm tra tính tương thích (`portalSdkCompatibilityPlugin`) và xử lý index.raw.html (`portalRawIndexHtmlPlugin`).
11. `@digiforce/portal-sdk/compat`: Metadata và helper xác thực phiên bản template/SDK.

---

## 2. Chi tiết các Module & Functions

### 2.1. Module Runtime (`sdk/src/runtime`)
Chịu trách nhiệm đọc cấu hình runtime từ `window` (do server inject) hoặc biến môi trường `import.meta.env`.

* `getPortalBase()`: Trả về path base chuẩn hóa của Portal (ví dụ: `/` hoặc `/x/apps/my-app/portal-name/`).
* `getRuntimeApiUrl()`: Lấy URL endpoint backend API (`DIGIFORCE_API_URL` hoặc `/api`).
* `getDigiforceAppName()`: Phân giải tên sub-app (trả về `'main'` hoặc tên app tương ứng trong kiến trúc multi-app).
* `getDigiforcePortalName()`: Lấy định danh của portal từ đường dẫn URL.
* `resolveDigiforceServerUrl(path)`: Tạo URL trỏ thẳng tới server backend với path tương ứng.
* `resolveDigiforceSettingsUrl()`: Trả về đường dẫn trang quản trị Settings trên server.
* `resolvePortalUrl(path)`: Giải quyết URL callback chuyển hướng nội bộ Portal.
* `portalRuntimeStore`: Store quản lý lỗi nghiêm trọng của portal (ví dụ lỗi phiên bản, lỗi service down).

---

### 2.2. Module Client & Session (`sdk/src/client`)

#### Lớp `AuthSession` & instance `authSession`:
Quản lý lưu trữ trạng thái đăng nhập có prefix namespace theo sub-app:
* `get(field)` / `set(field, value)`: Thao tác với `token`, `auth` (authenticator), `role`, `locale`.
* `getStorageKey(field)`: Tạo key dạng `DIGIFORCE_<APPNAME>_<FIELD>`. Hỗ trợ chia sẻ token giữa sub-apps nếu cấu hình `shareToken`.
* `subscribe(listener)`: Lắng nghe thay đổi của token/auth/role để cập nhật client hoặc socket.
* `clearAuthentication()`: Xoá token, authenticator và role đang lưu.
* `getCookie(name)`: Đọc cookie dự phòng (`nb_role_<app>`, `nb_csrf_token_<app>`).

#### Lớp `DigiforceClient` & instance `digiforceClient`:
HTTP Fetch wrapper tích hợp chặt chẽ với cơ chế bảo mật của NocoBase:
* `getHeaders(options)`: Tự động đính kèm các header cần thiết:
  * `Authorization: Bearer <token>`
  * `X-Authenticator: <authenticator>`
  * `X-Role: <role>` (khi `includeRole: true`)
  * `X-With-ACL-Meta: true` (yêu cầu server trả về metadata quyền hạn kèm record)
  * `X-Locale: <locale>`
  * `X-Timezone: <+07:00>`
  * `X-CSRF-Token`: Tự động lấy từ cookie cho các method không an toàn (POST, PUT, DELETE).
* `request<T>(endpoint, options)`: Thực thi HTTP request, bắt header `x-new-token` (refresh token tự động), giải nén payload (`unwrap: 'data' | 'deep-data' | 'none'`), normalize `DigiforceHttpError`.
* `action<T>(resource, action, options)`: Gọi RPC action của NocoBase dạng `<resource>:<action>` (ví dụ: `users:get`, `roles:check`, `systemSettings:get`).
* `stream(endpoint, options)`: Hỗ trợ SSE (Server-Sent Events) streaming.

#### Lớp `DigiforceWebSocketClient` & instance `digiforceWebSocket`:
* Quản lý kết nối socket tới server backend (`/ws?__appName=...`).
* Tự động gửi frame xác thực `{ type: 'auth:token', payload: { token, authenticator } }` ngay khi kết nối mở hoặc khi `authSession` đổi token.
* Tự động ping heartbeat định kỳ và retry reconnection dạng exponential backoff.

---

### 2.3. Module Auth (`sdk/src/auth`)
Cung cấp Refine `authProvider` hoàn chỉnh:
* `login({ authenticator, username, email, password, ... })`: Gọi action `auth:signIn`, lưu token vào `authSession`, dọn dẹp cache ACL cũ.
* `logout()`: Gọi action `auth:signOut`, dọn sạch session, cache permissions, và điều hướng về `/login` hoặc URL redirect của SSO.
* `check()`: Kiểm tra tính hợp lệ của phiên đăng nhập qua `auth:check`.
  * Có cơ chế tự động xử lý stale role (khi role cũ bị xóa/thu hồi): tự động clear role và fetch lại.
  * Tự động logout nếu gặp các mã lỗi xác thực (`TOKEN_INVALID`, `EXPIRED_SESSION`, `USER_LOCKED`, v.v.).
* `getIdentity()`: Trả về thông tin user hiện tại (`id`, `fullName`, `email`, `avatar`, `roles`).
* `getPermissions()`: Trả về permission set nạp từ `aclStore.load()`.
* `onError(error)`: Xử lý tập trung các lỗi 401 hoặc lỗi phân quyền để quyết định logout hay reload.
* `register()` & `forgotPassword()`: Hỗ trợ đăng ký và quên mật khẩu qua `auth:signUp` và `auth:lostPassword`.

---

### 2.4. Module ACL (`sdk/src/acl`)
Hệ thống phân quyền RBAC & Record-level Access Control:
* `loadAcl()`: Gọi `roles:check` để nạp danh sách quyền của role hiện tại (`AclPermissionSet`), lưu vào `aclStore`.
* `switchRole(roleName)`: Gọi `users:setDefaultRole` và `auth:syncCookies` để chuyển role đang hoạt động của người dùng, sau đó reset cache ACL.
* `aclStore`: Subscribable store chứa trạng thái ACL (`idle`, `loading`, `ready`, `error`).
* `accessControlProvider`: Cung cấp hàm `can({ resource, action, params })` cho Refine để quyết định hiển thị/ẩn nút hoặc menu.
* `checkActionPermission(permissions, options)`: Đánh giá quyền trên tài nguyên (Resource Action) dựa vào cấu hình role.
* `updateRecordPermissions(...)` / `getRecordActionPermission(...)`: Cache và truy xuất quyền hạn trên từng bản ghi cụ thể (Record-level ACL) được backend trả về trong `allowedActions`.
* React Hooks:
  * `useAcl()`: Hook truy cập trạng thái permissions hiện tại.
  * `useRecordPermission({ resource, recordId, action })`: Kiểm tra xem user có quyền sửa/xóa bản ghi cụ thể không.
  * `useCanAccess()`: Kiểm tra quyền truy cập tổng quát cho component.

---

### 2.5. Module Data (`sdk/src/data`)
Refine `dataProvider` tương thích với API REST của Digiforce:
* Chuyển đổi bộ lọc Refine `filters` sang cú pháp NocoBase qua `toDigiforceFilter`:
  * Map toán tử: `eq` -> `$eq`, `ne` -> `$ne`, `contains` -> `$includes`, `in` -> `$in`, `between` -> `$between`, v.v.
* `getList`: Gọi `<resource>:list` kèm phân trang (`page`, `pageSize`), sắp xếp `sort` và bộ lọc `filter`. Tự động gọi `cacheAllowedActions` để ghi nhận quyền trên các bản ghi vừa nạp.
* `getOne` / `getMany`: Gọi `<resource>:get` với `filterByTk: id`.
* `create` / `createMany`: Gọi `<resource>:create` (POST).
* `update` / `updateMany`: Gọi `<resource>:update` (POST) kèm `filterByTk`.
* `deleteOne` / `deleteMany`: Gọi `<resource>:destroy` (POST) kèm `filterByTk`.
* Tự động đính kèm `X-Data-Source: <key>` nếu truy vấn trên external data source.

---

### 2.6. Module Routing (`sdk/src/routing`)
* `defineAppRoutes(routes)`: Hàm type-safe khai báo danh sách route của ứng dụng.
* `buildRouteResources(routes)`:
  * Duyệt cây route và tự động compile thành mảng `ResourceProps` cho Refine.
  * Tự động liên kết các route con có `resourceAction` (`'create' | 'edit' | 'show'`) thành các path tương ứng trên Refine resource của cha.
* `renderAppRoutes(routes, options)`:
  * Render cây route cho React Router.
  * Hỗ trợ lazy loading trang (`Suspense` + `lazy`) với fallback component.
  * Tự động bọc `AccessGuard` để kiểm tra role quyền trước khi nạp chunk code của trang.
  * Tự động render `<Outlet />` cho các route cha chứa actions (`RouteDrawer`/`RouteDialog`).
* Route Surface Hooks:
  * `useRouteSurfaceState()`: Quản lý trạng thái mở/đóng của Drawer/Dialog phụ thuộc vào route URL.
  * `useRouteSurfaceClose()`: Hàm đóng modal/drawer và navigate về path cha.

---

### 2.7. Module Extensions (`sdk/src/extensions`)
Hỗ trợ cơ chế module mở rộng độc lập (Registry extensions):
* Type `AppExtension`:
  * `id`, `priority`: Thứ tự ưu tiên.
  * `routes`: Các route mở rộng của extension.
  * `resources`: Refine resources đóng góp.
  * `Provider`: React Context Provider bọc quanh App.
  * `AuthRuntimeProvider`: Provider chạy trong phạm vi đã xác thực.
  * `UserMenuItems`: Component đóng góp vào menu user.
  * `authAdapters`: Adapter đăng nhập bổ sung (SSO, OAuth, OTP,...).
* `collectAppExtensionContributions({ extensions, appRoutes, registryRoutesEnabled })`: Tập hợp và chuẩn hóa tất cả routes, resources, providers theo đúng thứ tự ưu tiên.

---

### 2.8. Module System Settings & i18n
* `loadSystemSettings(force)`: Cache request lấy cấu hình toàn hệ thống (app title, logo, settings). Tránh spam request nhờ deduplication promise.
* `clearSystemSettingsCache()`: Xoá cache cấu hình khi có thay đổi.
* `i18nProvider`: Refine i18n adapter đồng bộ ngôn ngữ giữa App và `authSession`/`digiforceClient`.

---

## 3. Các luồng hoạt động chính (Flow Diagrams)

### 3.1. Luồng Khởi động Ứng dụng (App Bootstrap Flow)

```
[Trình duyệt mở trang]
        |
        v
[Vite index.html] (Đọc window.DIGIFORCE_PORTAL_BASE, DIGIFORCE_API_URL)
        |
        v
[App.tsx render]
        |
        +---> [PortalRuntimeGate] (Kiểm tra lỗi runtime nghiêm trọng)
        |
        +---> [AppAuthRuntimeProviders] (Nạp các Auth Provider từ Extensions)
        |
        +---> [SystemSettingsProvider] (Gọi loadSystemSettings() -> cache)
        |
        +---> [AclStoreProvider (store={aclStore})]
        |
        +---> [Refine Khởi tạo]:
                 - authProvider.check()
                 - authProvider.getPermissions() -> aclStore.load()
                 - buildRouteResources() truyền vào Refine resources
        |
        v
[AppRoutes Render]:
  Kiểm tra routeGuard/access.roles -> Nếu pass, lazy import component trang.
```

---

### 3.2. Luồng Xác thực & Đăng nhập (Authentication Flow)

```
[Người dùng submit Form Đăng nhập]
        |
        v
[authProvider.login()]
        |
        +---> digiforceClient.action('auth', 'signIn', { body, authenticator })
        |
[Server trả về Token]
        |
        +---> authSession.set('token', token)
        +---> authSession.set('auth', authenticator)
        +---> clearAcl() & clearCurrentUserCache()
        +---> digiforceWebSocket.authenticate() (Gửi token qua socket)
        |
        v
[Điều hướng về Route đích / dashboard]
        |
        v
[authProvider.check() & loadAcl()] được kích hoạt để nạp thông tin user và role
```

---

### 3.3. Luồng Truy vấn Dữ liệu & Phân quyền Record (Data Fetch & Record ACL Flow)

```
[Trang gọi useList / useTable từ Refine]
        |
        v
[dataProvider.getList({ resource, filters, sorters, meta })]
        |
        +---> toDigiforceFilter(): chuyển đổi bộ lọc sang cú pháp NocoBase ($and, $includes, $eq, ...)
        +---> digiforceClient.action(resource, 'list', headers: { 'X-With-ACL-Meta': 'true' })
        |
[Server NocoBase trả về data + meta.allowedActions]
        |
        +---> cacheAllowedActions():
        |        Lưu danh sách action được phép (view, update, destroy)
        |        theo từng recordId vào recordPermissions store
        |
        v
[Component Table/Card Render]:
  Nút "Sửa" hoặc "Xóa" gọi useRecordPermission({ recordId, action: 'update' })
  để quyết định hiển thị hoặc disable nút tức thì mà không cần gọi API riêng lẻ.
```

---

## 4. Hướng dẫn & Quy tắc dành riêng cho AI Agents khi làm việc với SDK

Khi AI Agent thực hiện code hoặc refactor trong repo này, **BẮT BUỘC** tuân thủ các quy tắc sau:

1. **Không import file nội bộ từ `sdk/src/...` vào code ngoài SDK**:
   * Luôn sử dụng public sub-path exports: `@digiforce/portal-sdk/client`, `@digiforce/portal-sdk/auth`, `@digiforce/portal-sdk/data`, `@digiforce/portal-sdk/routing`, `@digiforce/portal-sdk/acl`, v.v.
2. **Khai báo route duy nhất qua `defineAppRoutes`**:
   * Route trang nghiệp vụ phải khai báo trong `src/routes.tsx` bằng `defineAppRoutes`. Không tạo các Route tách rời bỏ qua cơ chế Refine resource.
   * Sử dụng `lazy: () => import(...)` để tối ưu tải trang.
3. **Thao tác API luôn đi qua `digiforceClient` hoặc Refine hooks**:
   * Tuyệt đối không gọi `fetch` trần (raw fetch). `digiforceClient` đã tự động xử lý token renewal (`x-new-token`), CSRF, locale, timezone, portal name và unwrap data.
4. **Phân quyền Route và Phân quyền Nút**:
   * Phân quyền truy cập route: Dùng thuộc tính `access.roles: ['admin', ...]` trong `defineAppRoutes`.
   * Phân quyền ẩn hiện thành phần UI / Nút bấm: Dùng `CanAccess` hoặc hook `useRecordPermission` (đối với hành động trên 1 record cụ thể).
5. **Không đưa UI / Styling vào SDK**:
   * Thư mục `sdk/` chỉ chứa core logic, interfaces, adapters và headless hooks. Toàn bộ UI (shadcn, Lucide icons, CSS Tailwind) thuộc về application host (`src/`).
6. **Quy chuẩn Toán tử Null trong Data Provider**:
   * Trong `sdk/src/data/index.ts`, toán tử `null` và `nnull` của Refine phải luôn được map tương ứng sang `$empty` và `$notEmpty` của NocoBase. Tránh tuyệt đối map thành `$null` vì Sequelize/PostgreSQL backend không có toán tử `$null`, sẽ đối xử nó như raw object và văng lỗi SQL: `invalid input syntax for type bigint: "[object Object]"`.
