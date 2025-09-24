# 🔒 CRITICAL SYSTEMS TESTING GUIDE

## SocketIOService - LOCKED SYSTEM TESTING

**Before modifying SocketIOService.ts, you MUST run all these tests and verify they pass.**

### 1. Basic Connection Test
```
1. Open browser to http://localhost:5173
2. Open DevTools Console
3. Check for these messages:
   ✅ "Frontend logger initialized" 
   ✅ "🔌 Connected to backend"
   ❌ NO "WebSocket connection failed" errors
```

### 2. Authentication Flow Test
```
1. Click "Test Auth" button
2. Check DevTools Console for:
   ✅ "🔐 Starting auth test with password..."
   ✅ "🔐 Sending password auth request: {type: 'auth_password', password: 'koti2025'}"
   ✅ "🔐 Auth response received: {success: true, data: {…}, message: 'Password authentication successful'}"
   ✅ "🔐 Auth token saved: eyJhbGciOiJIUzI1NiIs..."

3. Check backend logs (https://kodinohjaus.fi/api/logs/frontend?limit=10)
   ✅ All 🔐 messages appear in backend logs within 5-10 seconds
```

### 3. Frontend Logging Test
```
1. Click "Test Frontend Logging" button
2. Check DevTools Console for:
   ✅ "Test log message"
   ✅ "Test info message" 
   ✅ "Test warning message"
   ✅ "Test error message"
   ✅ "Uncaught Error: Test unhandled error"

3. Check backend logs (https://kodinohjaus.fi/api/logs/frontend?limit=10)
   ✅ All test messages appear in backend with correct levels (INFO/WARN/ERROR)
   ✅ Unhandled error includes stack trace
```

### 4. React StrictMode Test
```
1. Verify src/main.tsx has <React.StrictMode> enabled
2. Refresh page multiple times
3. Check DevTools Console:
   ✅ Should see "🔌 Reusing existing socket instance" (singleton working)
   ❌ Should NOT see multiple "🔌 Connected to backend" messages per refresh
   ❌ Should NOT see "WebSocket connection failed" errors
```

### 5. SQL Query Test (After Auth)
```
1. Complete authentication first (Test Auth button)
2. Click "Test SQL Query" button  
3. Check for successful database query
4. Verify SQL query works with authentication token
```

### 6. Backend Request Types Test
```
Verify these request types work (check RequestHandler.ts):
✅ auth_location - Location authentication
✅ auth_password - Password authentication  
✅ verify_token - Token verification
✅ sql_query - Layout saves, general SQL
✅ database_query - General database queries
✅ database_write - Write operations (requires auth)
✅ controller_command - Device control (requires auth)
✅ trend_query - Historical data (3 types)
✅ get_global_data - Controller status
✅ get_controller_status - Connection status
```

## 🚨 FAILURE SCENARIOS - DO NOT PROCEED IF YOU SEE:

### Critical Failures (STOP DEVELOPMENT)
- WebSocket connection errors in console
- Authentication requests timing out
- Frontend logs not appearing in backend within 10 seconds
- Multiple socket connections being created
- StrictMode causing disconnect errors

### Warning Failures (Fix Before Proceeding) 
- Any console errors during testing
- Backend logs showing [object Object] instead of readable data
- Authentication tokens not being saved
- SQL queries failing after authentication

## 🔧 Recovery Steps If Tests Fail

### If SocketIO Connection Fails:
1. Check backend is running: https://kodinohjaus.fi/health
2. Verify singleton pattern in SocketProvider.tsx
3. Check for StrictMode double-mounting issues

### If Authentication Fails:
1. Verify request type is 'auth_password' (not 'authenticate_password')
2. Check useAuth hook exports correct functions
3. Verify backend RequestHandler.ts handles auth_password

### If Frontend Logging Fails:
1. Check frontendLogger.ts initialization in main.tsx
2. Verify console method interception is working
3. Check backend endpoint /api/logs/frontend/batch

## 📝 Test Results Log Template

```
Date: ____________________
Tester: __________________

[ ] Basic Connection Test - PASS/FAIL
[ ] Authentication Flow Test - PASS/FAIL  
[ ] Frontend Logging Test - PASS/FAIL
[ ] React StrictMode Test - PASS/FAIL
[ ] SQL Query Test - PASS/FAIL
[ ] Backend Request Types Test - PASS/FAIL

Notes:
_________________________________
_________________________________
_________________________________

Approval to modify SocketIOService: YES/NO
Signature: _______________
```

**Remember: This system took significant debugging to get working. Don't break what's already working!** 🔒

---

# 🎯 ZOOM/PAN REGRESSION TESTING

**The zoom/pan functionality is currently working perfectly and MUST NOT break during development.**

## Critical Functionality Protected
- **Desktop Mouse Wheel Zoom**: Zoom in/out with scroll wheel
- **Desktop Mouse Drag Panning**: Click and drag to pan around
- **Mobile Single-Finger Pan**: Touch and drag on mobile
- **Mobile Two-Finger Pinch Zoom**: Pinch to zoom on mobile
- **Zoom Limits**: Min 0.5x, Max 3x zoom levels
- **Smooth Transitions**: Proper transform animations

## 🧪 Automated Test Suite

### 1. Unit Tests (Vitest + React Testing Library)

**Location**: `src/tests/`

**Run unit tests:**
```bash
npm run test          # Watch mode
npm run test:run      # Single run (recommended)
npm run test:ui       # UI mode
```

**Critical Tests:**
- `useZoomAndPan.test.ts`: Hook state management (15 tests)
- `Home.zoom-pan.test.tsx`: Component integration (6 tests)

### 2. End-to-End Tests (Playwright)

**Location**: `tests/e2e/`

**Run E2E tests:**
```bash
npm run test:e2e      # All browsers
npm run test:e2e-ui   # Interactive mode
```

**Coverage:**
- Mouse wheel zoom validation
- Mouse drag panning 
- Mobile touch interactions
- Cross-browser compatibility (Chrome, Firefox, Safari)
- State persistence testing

### 3. Full Test Suite

**Run all tests (before commits):**
```bash
npm run test:all      # Unit + E2E comprehensive testing
```

## 🚨 Regression Prevention Protocol

**BEFORE making ANY changes to zoom/pan related code:**

1. **Run baseline tests**: `npm run test:run`
   - Must show: **15/15 unit tests passing**

2. **Make your changes**

3. **Validate no regression**: `npm run test:all`
   - Unit tests: **Must remain 15/15 passing**
   - E2E tests: **Desktop functionality must pass**
   - If ANY tests fail: **REVERT CHANGES**

4. **Manual validation**:
   ```
   1. Open http://localhost:5173
   2. Navigate to Home page
   3. Test mouse wheel zoom (in/out)
   4. Test click-and-drag panning
   5. On mobile: test touch pan and pinch zoom
   6. Verify smooth animations
   7. Check zoom limits (0.5x - 3x)
   ```

## 🔧 Test Configuration Files

- `vitest.config.ts`: Unit test environment with jsdom
- `playwright.config.ts`: Multi-browser E2E testing
- `src/tests/vitest.setup.ts`: Global mocks and setup
- `package.json`: Test scripts and dependencies

## 📊 Test Coverage Status

**✅ Fully Covered:**
- Hook state management (scale, translate, imgSize)
- Component rendering and event setup
- Mouse interactions (wheel zoom, drag pan)
- Touch interactions (mobile pan, pinch zoom)
- Zoom limit enforcement
- Cross-browser compatibility

**🔄 Partial Coverage:**
- Mobile Safari specific behaviors (7/35 E2E tests failing on mobile)
- Touch event edge cases
- Performance under heavy interaction

## 💡 Debugging Failed Tests

1. **Unit test failures**: 
   ```bash
   npm run test:ui  # Visual debugging interface
   ```

2. **E2E test failures**:
   ```bash
   npm run test:e2e-ui  # Interactive Playwright mode
   ```

3. **Check test reports**:
   - Unit tests: Console output with detailed assertions
   - E2E tests: HTML report in `playwright-report/`

## 🎨 Adding New Tests

When adding new zoom/pan features:

1. **Add unit test** in `src/tests/` for hook logic
2. **Add component test** for integration behavior  
3. **Add E2E test** in `tests/e2e/` for user interactions
4. **Update this documentation** with new coverage

**Test Naming Convention:**
- Unit: `describe('useZoomAndPan - [feature]')`
- Component: `describe('Home Zoom/Pan - [feature]')`
- E2E: `test('should [user behavior]')`

## 🔒 Test Results Log Template

```
Date: ____________________
Developer: _______________

ZOOM/PAN REGRESSION TESTS:
[ ] Unit Tests (15/15) - PASS/FAIL
[ ] E2E Desktop Tests - PASS/FAIL  
[ ] Manual Validation - PASS/FAIL

Changes Made:
_________________________________
_________________________________

Test Results:
_________________________________
_________________________________

Approval to Deploy: YES/NO
Signature: _______________
```

**Remember: The goal is regression prevention** - these tests ensure that working functionality stays working as development continues.