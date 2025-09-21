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