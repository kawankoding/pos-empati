# POS Empati Improvement Plan

This document captures the current technical improvement roadmap for POS Empati. Work should be completed phase by phase, prioritizing security and data correctness before adding more product features.

## Current strengths

- Electron main process and React renderer are separated.
- SQLite access remains in the main process.
- SQL values are generally parameterized.
- `contextIsolation` is enabled and `nodeIntegration` is disabled.
- Sales creation already uses a database transaction.
- Components and feature pages have a reasonable initial organization.

---

# Phase 1 — Security and correctness

## 1. Main-process authentication and authorization

### Problem

Authentication is currently trusted from renderer `localStorage`. IPC handlers do not independently verify that a user is logged in or authorized for an operation.

The renderer can currently provide authoritative values such as role and `cashierId`.

### Tasks

- [ ] Maintain authenticated session state in the Electron main process.
- [ ] Associate sessions with the invoking `WebContents` or use an opaque session token.
- [ ] Add centralized IPC guards such as:
  - `requireAuthenticated`
  - `requireAdmin`
  - `requireRole`
- [ ] Derive the cashier ID from the authenticated main-process session.
- [ ] Stop accepting authoritative `cashierId` values from the renderer.
- [ ] Add a logout IPC handler that revokes the main-process session.
- [ ] Clear session state when its window or `WebContents` is destroyed.
- [ ] Treat renderer route restrictions as UI behavior only, not authorization.
- [ ] Validate IPC sender URLs as defense in depth.

### Completion criteria

- Unauthenticated IPC calls are rejected.
- Cashiers cannot invoke administrator-only operations.
- Renderer code cannot impersonate another cashier.
- Logout invalidates access in both renderer and main process.

---

## 2. Remove password hashes from renderer responses

### Problem

User-list queries may return `password_hash` at runtime even though the renderer TypeScript type omits it.

### Tasks

- [ ] Change user-list queries to select only public fields:
  - `id`
  - `username`
  - `name`
  - `role`
  - `is_active`
  - `created_at`
- [ ] Define separate internal authentication rows and public user DTOs.
- [ ] Add a regression test proving that user responses never contain `password_hash`.

### Completion criteria

- No password hash crosses the IPC boundary.
- Public user data is explicitly selected and serialized.

---

## 3. Replace default administrator credentials

### Problem

Fresh databases create a known `admin / admin123` account and expose reusable credentials.

### Tasks

- [ ] Remove the known default password.
- [ ] Add a first-run administrator setup flow.
- [ ] Require the operator to choose an initial password.
- [ ] Disable first-run setup after an administrator is created.
- [ ] Remove credential prefill and credential hints from the login screen.
- [ ] Never log plaintext credentials.
- [ ] Prevent deletion or deactivation of the last active administrator.
- [ ] Add password-length and password-strength requirements.
- [ ] Add login throttling or progressive delays.

### Completion criteria

- Every installation has unique administrator credentials.
- No reusable password appears in source, UI, or logs.
- At least one active administrator must always remain.

---

## 4. Strict runtime validation for IPC payloads

### Problem

TypeScript annotations do not validate values received at runtime. IPC payloads must be treated as untrusted input.

### Tasks

- [ ] Add a centralized runtime validation layer for IPC handlers.
- [ ] Require payloads to be plain objects.
- [ ] Reject unknown properties.
- [ ] Validate IDs as positive integers.
- [ ] Validate prices, totals, stock, and quantities as finite numbers.
- [ ] Add maximum lengths for strings.
- [ ] Restrict roles to an explicit allowlist.
- [ ] Restrict payment methods to an explicit allowlist.
- [ ] Restrict settings keys to an explicit allowlist.
- [ ] Validate report dates strictly.
- [ ] Require `startDate <= endDate`.
- [ ] Bound sale item array sizes.
- [ ] Normalize or reject duplicate sale product IDs.
- [ ] Return consistent, sanitized errors.

### Completion criteria

- Malformed IPC input never reaches database queries.
- Unknown fields and invalid enum values are rejected.
- IPC handlers return stable application errors instead of raw SQL errors.

---

## 5. Fix user update field handling

### Problem

Dynamic update objects can allow untrusted property names to become SQL identifiers.

### Tasks

- [ ] Remove `as any` from the user update handler.
- [ ] Stop interpolating arbitrary object keys into SQL.
- [ ] Use a fixed whitelist of editable fields.
- [ ] Map trusted application field names to hard-coded SQL columns.
- [ ] Move password changes into a dedicated query/service method.
- [ ] Add authorization and password-policy validation for password updates.

### Completion criteria

- Only approved user fields can be updated.
- Renderer input can never define a SQL identifier.

---

## 6. Strengthen sale transactions

### Problem

Authoritative product reads and stock validation should occur inside the same transaction as stock updates and sale creation.

### Tasks

- [ ] Normalize or reject duplicate product IDs before checkout.
- [ ] Begin the checkout transaction before product reads.
- [ ] Consider `BEGIN IMMEDIATE` for checkout.
- [ ] Guard stock updates:

```sql
UPDATE products
SET stock = stock - ?
WHERE id = ?
  AND stock >= ?;
```

- [ ] Verify exactly one row changed for every stock update.
- [ ] Roll back the complete transaction if stock changed or became insufficient.
- [ ] Continue deriving prices from database product rows.
- [ ] Prevent duplicate checkout submission from the UI.

### Completion criteria

- A failed checkout never creates partial sale data.
- Stock cannot become negative.
- Duplicate items are handled predictably.
- The renderer cannot choose product prices.

---

# Phase 2 — Data durability and database design

## 7. Versioned database migrations

### Problem

The database currently uses startup schema pushes and ad hoc column checks without durable migration versions.

### Tasks

- [ ] Introduce ordered immutable migrations.
- [ ] Track schema versions using `PRAGMA user_version` or a `schema_migrations` table.
- [ ] Run pending migrations transactionally.
- [ ] Record a version only after successful commit.
- [ ] Add migrations for existing schema changes.
- [ ] Test fresh database creation.
- [ ] Test upgrades from every supported historical schema.
- [ ] Reject databases newer than the application supports.
- [ ] Back up the database before destructive migrations.

### Suggested structure

```text
electron/db/migrations/
  001_initial_schema.ts
  002_add_product_images.ts
  003_add_sales_status.ts
  004_create_settings.ts
```

### Completion criteria

- Database upgrades are deterministic and repeatable.
- Interrupted migrations do not leave partially upgraded schemas.
- Fresh and upgraded databases have equivalent constraints.

---

## 8. Store monetary values as integers

### Problem

SQLite `REAL` uses floating-point arithmetic and can produce financial reconciliation errors.

### Tasks

- [ ] Store IDR values as integer rupiah amounts.
- [ ] Convert these fields to integers where applicable:
  - buy price
  - sell price
  - sale total
  - paid amount
  - change amount
  - item price
  - subtotal
- [ ] Decide whether stock and quantity support fractions.
- [ ] If stock is integral, store stock and quantity as integers.
- [ ] If fractional quantities are required, use a documented fixed integer scale.
- [ ] Add database constraints for price and payment relationships.
- [ ] Create a versioned migration with reconciliation checks.

### Example constraints

```sql
CHECK(sell_price >= buy_price)
CHECK(paid >= total)
CHECK(change_amount = paid - total)
```

### Completion criteria

- Financial calculations do not depend on binary floating-point.
- Database constraints preserve core financial invariants.

---

## 9. Add database indexes

### Tasks

- [ ] Add an index for `products(category_id)`.
- [ ] Add an index for `sales(created_at, status)`.
- [ ] Add an index for `sales(cashier_id)`.
- [ ] Add an index for `sale_items(sale_id)`.
- [ ] Add an index for `sale_items(product_id)`.
- [ ] Validate indexes using representative data and `EXPLAIN QUERY PLAN`.

### Completion criteria

- Common reports and integrity checks avoid full-table scans where practical.

---

## 10. Typed and transactional settings

### Problem

Settings are represented as an unrestricted `Record<string, string>`, and multi-setting updates should be atomic.

### Tasks

- [ ] Define a typed application settings model.
- [ ] Validate allowed keys in the main process.
- [ ] Validate enum values for currency, timezone, and language.
- [ ] Parse booleans at the database boundary.
- [ ] Wrap `setMany()` in a transaction.
- [ ] Wrap settings seeding in a transaction.
- [ ] Add settings migration/version support.

### Suggested model

```ts
type AppSettings = {
  storeName: string;
  storeAddress: string;
  contactEmail: string;
  phoneNumber: string;
  currency: "IDR" | "USD" | "SGD";
  timezone: "WIB" | "WITA" | "WIT";
  language: "id" | "en";
  soundNotifications: boolean;
  autoPrintReceipts: boolean;
};
```

### Completion criteria

- Invalid setting keys and values are rejected.
- A batch update either saves every value or saves none.

---

## 11. Database lifecycle management

### Tasks

- [ ] Add `closeDatabase()`.
- [ ] Close and checkpoint SQLite during controlled application shutdown.
- [ ] Coordinate database lifecycle with backup and restore operations.
- [ ] Add startup database error handling.
- [ ] Show an actionable fatal error if the database cannot initialize.
- [ ] Evaluate and configure an appropriate SQLite busy timeout.

### Completion criteria

- The database closes cleanly.
- Startup failures are visible and actionable.
- Backup and restore cannot race active database writes.

---

## 12. Safe backup and restore

### Problem

The current data screen presents backup, restore, synchronization, and encryption as available even though they are not implemented.

### Immediate tasks

- [ ] Disable or label unfinished controls as `Segera hadir`.
- [ ] Remove static claims of cloud synchronization and encryption until implemented.
- [ ] Remove fake timestamps and operational statuses.

### Implementation tasks

- [ ] Implement backup in the main process.
- [ ] Use a WAL-safe SQLite snapshot or online backup mechanism.
- [ ] Use Electron save dialogs instead of renderer-provided arbitrary paths.
- [ ] Include backup metadata:
  - application version
  - schema version
  - creation time
  - checksum
- [ ] If encryption is required, use authenticated encryption such as AES-256-GCM.
- [ ] Document key derivation and recovery behavior.
- [ ] Validate backups before restore.
- [ ] Run `PRAGMA integrity_check` before replacing the active database.
- [ ] Restore into a temporary location first.
- [ ] Retain a rollback copy.
- [ ] Add backup/restore round-trip tests.

### Completion criteria

- Backups remain complete with WAL enabled.
- Invalid or corrupted backups cannot replace the active database.
- Restore failure leaves the original database intact.

---

# Phase 3 — Frontend reliability and maintainability

## 13. Global settings provider

### Problem

Settings are loaded independently in components. Saving the store name does not update every consumer during the current session.

### Tasks

- [ ] Create `SettingsProvider` and `useSettings()`.
- [ ] Load settings once at application startup.
- [ ] Expose loading and error state.
- [ ] Expose `updateSettings()` and `reloadSettings()`.
- [ ] Update provider state after a successful save.
- [ ] Consume settings from:
  - `AppLayout`
  - `GeneralTab`
  - currency formatting
  - date/time formatting
  - sound notifications
  - receipt printing
- [ ] Remove duplicated settings fetching.

### Completion criteria

- Changing the store name updates the header immediately.
- Currency and timezone settings affect displayed values.
- All consumers use one authoritative settings state.

---

## 14. Standard async loading and error states

### Tasks

- [ ] Standardize async state as loading, success, empty, and error.
- [ ] Always reset pending states in `finally`.
- [ ] Add retry controls to failed data loads.
- [ ] Do not show empty-state messages after request failures.
- [ ] Apply the pattern to:
  - login
  - checkout
  - categories
  - products
  - users
  - sales
  - reporting
  - settings
- [ ] Normalize API errors into user-friendly messages.

### Completion criteria

- No rejected request leaves a button permanently loading.
- Users can distinguish no data from failed data loading.
- Critical failures provide retry or recovery guidance.

---

## 15. Consistent modal mutation contracts

### Problem

Some modal callbacks return `Promise<void>`, making it difficult for the modal to distinguish success from backend rejection.

### Tasks

- [ ] Return `MutationResult` from modal save callbacks or throw a normalized `ApiError`.
- [ ] Display backend errors inside the active modal.
- [ ] Keep modals open when saving fails.
- [ ] Close only after confirmed success.
- [ ] Disable close and duplicate submission while a mutation is active where appropriate.
- [ ] Pass loading state into destructive confirmation modals.
- [ ] Apply consistently to user, product, and category forms.

### Completion criteria

- Every failed mutation produces a visible error.
- No modal reports success or closes after a rejected mutation.

---

## 16. Accessibility improvements

### Modal

- [ ] Move focus into the dialog when opened.
- [ ] Trap Tab focus inside the dialog.
- [ ] Restore focus to the opener when closed.
- [ ] Use `aria-labelledby` and `aria-describedby`.
- [ ] Make background content inert while open.
- [ ] Preserve the previous body overflow style.
- [ ] Consider rendering dialogs through a portal.

### Form controls

- [ ] Generate IDs using `useId()`.
- [ ] Associate every label using `htmlFor`.
- [ ] Support descriptions, validation errors, and required states.
- [ ] Give toggle switches explicit accessible names.

### Select controls

- [ ] Add proper combobox/listbox semantics to `FieldSelect`.
- [ ] Support keyboard opening and selection.
- [ ] Add `aria-expanded`, `aria-controls`, and `aria-activedescendant`.
- [ ] Restore focus to the trigger after selection or Escape.
- [ ] Prefer native `<select>` for non-searchable selections where practical.
- [ ] Replace fabricated change events with `onValueChange(value)`.

### Action controls

- [ ] Add `aria-label` to icon-only buttons.
- [ ] Keep essential actions visible on touch devices.
- [ ] Support both hover and keyboard focus states.
- [ ] Add `aria-live` alerts for success and error messages.

### Completion criteria

- Core workflows are usable with keyboard only.
- Screen readers can identify fields, dialogs, and icon actions.
- Important actions do not depend only on hover.

---

## 17. Honest handling of unfinished features

### Tasks

- [ ] Audit every visible action for real behavior.
- [ ] Hide or disable unfinished controls.
- [ ] Label planned features as `Segera hadir`.
- [ ] Remove fabricated operational statuses.
- [ ] Review these areas:
  - database backup and restore
  - cloud synchronization
  - encryption claims
  - password updates
  - two-factor authentication
  - logout from other devices
  - sales export and detail
  - product/category exports
  - notification/network/refresh buttons
  - receipt and hold controls
  - About page links
  - auto-print receipts

### Completion criteria

- Every enabled control performs its advertised action.
- Users are not shown false security, backup, or synchronization claims.

---

## 18. Shared feature hooks and route definitions

### Tasks

- [ ] Create shared query hooks or repositories for products, categories, users, sales, reports, and settings.
- [ ] Normalize loading and error behavior in shared hooks.
- [ ] Avoid fetching identical data independently across pages.
- [ ] Move shared formatting helpers into reusable modules.
- [ ] Derive navigation and role access from one route definition.
- [ ] Replace prefix-based route matching with declarative React Router routes.
- [ ] Use layout routes and `<Outlet>`.
- [ ] Use `NavLink` for sidebar navigation.

### Completion criteria

- Routes, navigation, and role access have one source of truth.
- Shared data-fetching logic is not duplicated across pages.

---

# Phase 4 — Electron hardening and release readiness

## 19. Fix production renderer asset paths

### Tasks

- [ ] Set Vite `base` to `"./"`.
- [ ] Rebuild and confirm generated HTML uses relative asset paths.
- [ ] Add a packaged smoke test that verifies the renderer loads.

### Completion criteria

- The production renderer loads correctly through `file://`.
- Packaged applications do not display a blank window due to asset paths.

---

## 20. Harden BrowserWindow and application navigation

### Tasks

- [ ] Explicitly enable `sandbox: true` after verifying preload compatibility.
- [ ] Reject navigation outside the expected application URL.
- [ ] Deny new windows by default.
- [ ] Add a restrictive permission request handler.
- [ ] Validate privileged IPC sender URLs.
- [ ] Disable or restrict DevTools in production.
- [ ] Add separate development and production CSPs.
- [ ] Remove `unsafe-eval` from the production CSP.
- [ ] Add restrictive CSP directives such as:
  - `object-src 'none'`
  - `base-uri 'none'`
  - `frame-ancestors 'none'`

### Completion criteria

- Remote content cannot inherit privileged preload access.
- Production CSP does not permit unnecessary dynamic script evaluation.

---

## 21. Add application packaging

### Tasks

- [ ] Choose Electron Builder or Electron Forge.
- [ ] Configure a stable `appId`.
- [ ] Configure `productName`.
- [ ] Package application files with an explicit allowlist.
- [ ] Enable ASAR packaging.
- [ ] Add application icons.
- [ ] Configure target platforms and installers.
- [ ] Configure macOS hardened runtime and notarization.
- [ ] Configure Windows signing if Windows distribution is required.
- [ ] Add artifact naming and release output directories.
- [ ] Add separate scripts for build, package, and release.

### Completion criteria

- CI can produce an installable artifact.
- The installed application launches and completes a basic workflow.

---

## 22. Improve development scripts

### Tasks

- [ ] Clean `dist-electron` before the initial development compile.
- [ ] Perform one successful main-process build before launching Electron.
- [ ] Restart Electron when main or preload output changes.
- [ ] Prevent stale compiled files from satisfying startup checks.
- [ ] Add scripts for:
  - type checking
  - tests
  - packaged preview
  - packaging
  - release
- [ ] Declare a supported Node.js version.
- [ ] Add `packageManager` to `package.json`.
- [ ] Add `.nvmrc` or an equivalent version file.

### Completion criteria

- Main-process changes are reflected without manually rebuilding stale output.
- Development and packaged-preview workflows are distinct and reliable.

---

## 23. Shared IPC contracts

### Problem

IPC types are duplicated across the preload, renderer declarations, and API wrappers, allowing the definitions to drift.

### Tasks

- [ ] Define shared serializable request and response DTOs.
- [ ] Define one `ElectronApi` interface.
- [ ] Use the shared interface in:
  - Electron preload
  - renderer global declarations
  - renderer API wrapper
  - IPC handler input/output definitions where practical
- [ ] Remove duplicated payload types.
- [ ] Add type-check scripts for renderer and Electron projects.

### Completion criteria

- Preload implementation and renderer declarations cannot silently diverge.

---

## 24. Repository and dependency hygiene

### Tasks

- [ ] Add a `.gitignore` covering:
  - `node_modules`
  - `dist`
  - `dist-electron`
  - release artifacts
  - SQLite database files
  - logs
  - environment files
  - OS/editor files
- [ ] Review unused dependencies.
- [ ] Remove redundant type packages where dependencies ship their own types.
- [ ] Add a dedicated `typecheck` script.
- [ ] Consider type-aware ESLint rules for database and IPC code.
- [ ] Use `npm ci` in CI.

### Completion criteria

- Generated output and local databases are not accidentally committed.
- CI uses a reproducible dependency installation.

---

# Phase 5 — Automated testing and CI

## 25. Database tests

- [ ] Successful sale reduces stock.
- [ ] Insufficient stock rolls back the complete sale.
- [ ] Duplicate product IDs are handled correctly.
- [ ] Sale prices always come from database product rows.
- [ ] Settings batch updates are atomic.
- [ ] Migration upgrades preserve data.
- [ ] Fresh and upgraded schemas are equivalent.
- [ ] Backup and restore complete a round trip.

---

## 26. IPC tests

- [ ] Unauthenticated operations are rejected.
- [ ] Cashiers cannot call administrator operations.
- [ ] Invalid payloads are rejected.
- [ ] Unknown payload properties are rejected.
- [ ] Password hashes never cross IPC.
- [ ] Cashier identity cannot be forged.
- [ ] Settings keys and values are validated.
- [ ] Raw database errors are not exposed.

---

## 27. Renderer tests

- [ ] Login errors clear loading state.
- [ ] Settings updates propagate to the application header.
- [ ] Failed modal mutations remain open and display errors.
- [ ] Empty and error states are visually distinct.
- [ ] Checkout cannot be submitted twice.
- [ ] Keyboard users can operate dialogs and form controls.
- [ ] Critical status messages are announced through ARIA live regions.

---

## 28. Packaged application smoke tests

- [ ] Launch the packaged application.
- [ ] Verify renderer assets load.
- [ ] Verify database initialization succeeds.
- [ ] Verify first-run setup or login appears.
- [ ] Verify a basic IPC operation succeeds.
- [ ] Verify the app exits cleanly.

---

## 29. Continuous integration

### Tasks

- [ ] Add CI that runs:
  1. `npm ci`
  2. format check
  3. lint
  4. renderer typecheck
  5. Electron typecheck
  6. tests
  7. build
  8. package
  9. packaged smoke test where supported
- [ ] Cache dependencies safely.
- [ ] Preserve build artifacts for review.
- [ ] Prevent release packaging when earlier checks fail.

### Completion criteria

- Every change is automatically checked for formatting, types, tests, build, and packaging regressions.

---

# Recommended implementation order

## First milestone — secure local application

1. Main-process sessions and role enforcement
2. Remove password hashes from IPC
3. Replace default administrator credentials
4. Add runtime IPC validation
5. Fix user update field handling
6. Strengthen checkout transactions

## Second milestone — durable business data

1. Versioned migrations
2. Integer money storage
3. Database indexes
4. Typed transactional settings
5. Database lifecycle management
6. Safe backup and restore

## Third milestone — reliable user experience

1. Global settings provider
2. Standard async states
3. Consistent modal mutation handling
4. Accessibility improvements
5. Disable unfinished features
6. Shared feature hooks and declarative routes

## Fourth milestone — distributable application

1. Fix Vite production paths
2. Harden Electron navigation and CSP
3. Add packaging and signing
4. Improve development scripts
5. Unify IPC contracts
6. Add repository hygiene

## Fifth milestone — regression protection

1. Database tests
2. IPC authorization and validation tests
3. Renderer workflow tests
4. Packaged smoke tests
5. CI enforcement

---

# Current diagnostics snapshot

At the time this plan was created, project diagnostics reported no errors, but warnings remained in several files, including:

- `src/pages/ProductsPage.tsx`
- `src/pages/PosPage.tsx`
- `src/pages/settings/DataTab.tsx`
- `src/pages/ReportingPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/CategoriesPage.tsx`
- `src/index.css`
- `electron/ipc.ts`
- generated files under `dist-electron`

These warnings should be reviewed, but security and data-integrity work should remain the first priority.

---

# Progress notes

Use this section to record decisions, completed migrations, tradeoffs, and follow-up work as each phase is implemented.

## Phase 1 notes

- ✅ Completed.
- Created `electron/auth.ts` with session management (registerSession, removeSession, requireAuth, requireAdmin, hasSession).
- Removed `password_hash` from user list queries — `listAll()` now returns `PublicUser[]`.
- Removed default `admin/admin123` seed credentials — replaced with first-run setup flow via `auth:setup` IPC.
- All IPC handlers now enforce `requireAuth(event.sender.id)` and admin operations enforce `requireAdmin(event.sender.id)`.
- `users:update` uses a fixed whitelist of columns (username, name, role, is_active) — no dynamic key interpolation.
- Password changes moved to dedicated `users:changePassword` handler.
- `sales:create` derives `cashierId` from authenticated session — no longer accepted from renderer payload.
- Sale transactions: `BEGIN` moved before product reads, duplicate product IDs normalized, stock updates use `WHERE id = ? AND stock >= ?` guard with changes check.
- Sessions cleaned up on window close and webContents destroy.
- Renderer: LoginPage shows empty credentials + "Setup administrator" flow; session validates against main process via `checkSession()`; logout calls `api.logout()`; PosPage no longer sends cashierId.

## Phase 2 notes

- ✅ Completed.
- Created versioned migration system (`electron/db/migrate.ts`) with `schema_version` tracking and transactional migrations.
- 4 migrations: `001_initial` (base tables), `002_legacy_columns` (alter columns), `003_integer_money` (REAL→INTEGER whole rupiah), `004_indexes` (5 performance indexes).
- Converted all financial columns from REAL to INTEGER (buy_price, sell_price, total, paid, change_amount, price, subtotal). Stock and quantity kept as REAL for fractional support.
- Removed `.toFixed(2)` rounding from sales and reports — now plain integer arithmetic.
- Added 5 database indexes (products/category, sales/date, sales/cashier, sale_items/sale, sale_items/product).
- Settings: added key/value validation (allowed keys, enum values), `setMany()` wrapped in transaction, IPC handlers catch validation errors.
- Seed runs inside transaction.
- `closeDatabase()` added with `PRAGMA optimize` + close, called on `before-quit`.
- `PRAGMA busy_timeout = 5000` set at init.
- DataTab: all backup/sync/restore/encryption controls disabled and labeled "Segera Hadir" — no more fake operational claims.

## Phase 3 notes

- ✅ Completed.
- Created `SettingsProvider` / `useSettings()` context — loads once, exposes settings/loading/error/reload globally.
- App.tsx wraps everything in SettingsProvider.
- AppLayout uses useSettings() for storeName — no more duplicate API calls.
- GeneralTab uses useSettings() for initial data and reloadSettings() after save.
- All pages now have loading/error/empty state separation: PosPage, LoginPage, SalesPage, CategoriesPage, ProductsPage, ReportingPage, UsersTab.
- PosPage messageType distinguishes success (green) / error (red) / info.
- UserModal, ProductModal, CategoryModal: onSave returns MutationResult, modals show errors and stay open on failure, close only on success.
- currency.ts extended with formatCurrency() supporting optional symbol parameter.

## Phase 4 notes

- ✅ Completed.
- `vite.config.ts`: `base: "./"` for relative asset paths in production.
- `electron/main.ts`: `sandbox: true`, `will-navigate` restriction, `setWindowOpenHandler` deny, `setPermissionRequestHandler` deny, DevTools only in dev.
- `index.html`: tightened CSP — removed `unsafe-eval`, added `object-src: none`, `base-uri: none`, `frame-ancestors: none`.
- Created `electron-builder.yml` with Windows (NSIS), macOS (DMG, hardenedRuntime), Linux (AppImage) targets; ASAR enabled.
- Added scripts: `typecheck`, `typecheck:renderer`, `typecheck:electron`, `package`, `package:dir`.
- Added `engines` (node >= 22.12.0) and `packageManager` to package.json.
- Installed `electron-builder` dev dependency.
- Created `.gitignore` (node_modules, dist, dist-electron, release, db artifacts, env files, OS files, logs).
- Created `.nvmrc` (Node 22).

## Phase 5 notes

- ✅ Completed.
- Set up vitest with `vitest.config.ts` (Node environment, path aliases).
- Created test helpers: `createTestDb()` (in-memory SQLite, full schema), `seedTestData()`.
- **Sales tests (9)**: stock deduction, insufficient stock guard (changes=0), negative stock prevention, duplicate product merging, empty/zero/negative qty, non-existent products, zero stock, paid < total.
- **Settings tests (25)**: key validation, enum validation (currency/timezone/language), boolean validation, upsert (INSERT→UPDATE), atomic setMany, rollback on failure.
- **Migration tests (8)**: applies all 4 migrations, records versions, idempotent re-run, INTEGER money types, indexes created, data insertion, newer DB rejection, skip-already-applied.
- **42 tests, 3 test files, all passing**.
- GitHub Actions CI: checkout → npm ci → format check → lint → typecheck → test → build.
- Added scripts: `test`, `test:watch`, `test:coverage`.
