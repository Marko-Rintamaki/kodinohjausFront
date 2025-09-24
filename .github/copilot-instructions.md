# Kodinohjaus Smart Home System - AI Agent Instructions

## 🚨 CRITICAL DEVELOPMENT WORKFLOW

### Code Migration Protocol (vanhat/ → src/)
**MANDATORY PROCESS** when migrating legacy code:

1. **📋 ANALYZE FIRST**: Create detailed functional analysis of legacy code before touching anything
   - Document ALL features, components, hooks, state management
   - Map data models, interfaces, and dependencies  
   - Identify critical functionality and integration points
   - Create migration checklist with priority order

2. **🔄 ONE FUNCTION AT A TIME**: Never migrate multiple features simultaneously
   - Pick ONE specific function from analysis (e.g., "add lamps functionality")
   - Implement ONLY that function in new code
   - Maintain feature parity with legacy version
   - Document any changes or improvements made

3. **✅ TEST AFTER EACH MIGRATION**: Comprehensive testing is mandatory
   - Run ALL existing tests: `npx vitest run` 
   - Ensure 100% test pass rate (26/26 tests currently)
   - Add new tests for the migrated functionality
   - Test integration with existing features
   - Verify no regressions in zoom/pan/auth systems

4. **📚 UPDATE DOCUMENTATION**: After successful migration
   - Update this instructions file with new capabilities
   - Document any API changes or new patterns
   - Add testing instructions for new functionality
   - Mark completed features in migration checklist

5. **🔒 MAINTAIN QUALITY**: Never compromise on code quality
   - Follow existing TypeScript patterns and interfaces
   - Maintain proper error handling and logging
   - Keep separation of concerns (components, hooks, helpers)
   - Ensure responsive design and mobile compatibility

**NEVER**: Skip analysis, migrate multiple features simultaneously, skip testing, leave failing tests

**Reference**: See `VANHAN_KOODIN_ANALYYSI.md` for complete legacy code analysis and migration roadmap.

## Architecture Overview

This is a **TypeScript backend + React frontend** smart home control system with real-time Socket.IO communication.

### Service-Oriented Backend (`kodinohjausBack/`)
- **Clean separation**: Each service handles its domain (`servicet hoitaa omia juttuja`)
- **Central RequestHandler**: All Socket.IO requests flow through `RequestHandler.ts` using `'request'` events with `type` field
- **Dependency injection**: Services are injected in `server.ts` initialization order
- **Two-tier logging**: Backend logs (`server_logs`) separate from frontend logs (`frontend_logs`)

### Key Services Pattern
```typescript
// Always follow this initialization order in server.ts:
const databaseService = new DatabaseService();
const loggingService = new LoggingService(databaseService); 
const authService = new AuthService(loggingService);
const requestHandler = new RequestHandler(loggingService, authService, databaseService, controllerService);
```

## Authentication System

**Location-based authentication** with password fallback:
- **Home coordinates**: `60.623857, 22.110013` (Turku, Finland)
- **Tolerance**: 1000m radius
- **Token lifetime**: 90 days JWT tokens
- **Flow**: Location → Backend validation → JWT token → Socket.IO auth

### Critical Auth Pattern
```typescript
// All requests go through RequestHandler.checkAuthentication()
// Controller commands REQUIRE authentication
// Database writes REQUIRE authentication  
// View operations work without auth
```

## Database Architecture

**MySQL with connection pooling**:
- **ViewPool**: Read-only operations (no auth required)
- **WritePool**: Write operations (authentication required)
- **Separate tables**: `server_logs` vs `frontend_logs` to prevent mixing

## Socket.IO Communication

### Request Format (CRITICAL)
```typescript
// Frontend MUST use 'type' field (not 'requestType')
socket.emit('request', {
  type: 'sql_query',  // NOT requestType!
  data: { sql: "SELECT * FROM ...", params: [] },
  token: "jwt_token"
});
```

### Request Types (from RequestHandler.ts)

#### Authentication (Always Allowed)
- `auth_location` - Location-based auth: `{ type: 'auth_location', location: { latitude: 60.623857, longitude: 22.110013 } }`
- `auth_password` - Password auth: `{ type: 'auth_password', password: 'koti2025' }`
- `verify_token` - Token verification: `{ type: 'verify_token', token: 'jwt_token' }`

#### Data Access (Read-Only, No Auth Required)
- `get_global_data` - Controller status + global info
- `get_controller_status` - Controller connection status
- `sql_query` - Layout loads: `{ type: 'sql_query', data: { sql: 'SELECT...', params: [] } }`
- `database_query` - General queries: `{ type: 'database_query', data: { query: 'SELECT...', params: [] } }`
- `trend_query` - Historical data: `{ type: 'trend_query', data: { queryType: 'nilan_trend', params: {} } }`

#### Write Operations (REQUIRES Authentication)
- `controller_command` - Device control: `{ type: 'controller_command', data: { command: 'set', id: 'relay1', value: true }, token: 'jwt' }`
- `database_write` - Data writes: `{ type: 'database_write', data: { query: 'INSERT...', params: [] }, token: 'jwt' }`
- `sql_query` with INSERT/UPDATE/DELETE (uses write pool if authenticated)

#### Response Format
```typescript
{
  success: boolean,
  data?: object | array,
  error?: string,
  message?: string,
  requiresAuth?: boolean
}
```

## Development Workflows

### Backend Development
```bash
cd kodinohjausBack
npm run dev  # Uses ts-node + nodemon for hot reload
npx tsc --noEmit  # Type checking without compilation
```

### Frontend Development  
```bash
cd kodinohjausFront
# CRITICAL: DO NOT START dev server - user has it running!
# npm run dev  # ALREADY RUNNING on :5173 by user
npm run build  # Production build to dist/
```

#### ⚠️ DEV SERVER WARNING
**NEVER run `npm run dev` or `npm start`** - the development server is already running on port 5173.
- **Current status**: Vite dev server active at `http://81.88.23.96:5173/`
- **Mobile access**: Works on all devices via public IP
- **If you need to restart**: Ask user first, don't kill processes

### Testing Critical Systems
```bash
# Test all auth scenarios (8 tests)
node test-auth-comprehensive.js

# Test all trend queries (3 types) 
node full-trend-test.js

# Test layout saving
node test-layout-read.js
```

## Frontend Logging System

**Automatic browser log capture**:
- **Initialize**: `initializeFrontendLogger()` in `main.tsx`
- **Intercepts**: All console methods + unhandled errors
- **Batches**: Logs sent to `/api/logs/frontend/batch`
- **Storage**: Separate `frontend_logs` table with metadata

## Project-Specific Conventions

### File Organization
- **Types**: Centralized in `kodinohjausBack/src/types/` with barrel exports
- **No dist/**: Use ts-node directly, `dist/` is gitignored
- **Service separation**: Each service is self-contained with clear dependencies

### Error Handling Pattern
```typescript
// Services always log errors before throwing
await this.loggingService.error('Operation failed', error, 'ServiceName');
throw new Error('User-facing message');
```

### Docker Integration
- **Hot reloading**: Docker uses nodemon + ts-node for development
- **Frontend serving**: Backend serves React build from `/frontend/dist` in container
- **Container restart**: `docker restart site-kodinohjaus` after backend changes

### API Endpoints
- `/health` - Service status
- `/api/logs` - Backend logs  
- `/api/logs/frontend` - Frontend logs
- All other routes serve React SPA

## Critical Notes for AI Agents

1. **🚨 NEVER START DEV SERVER**: User has `npm run dev` already running on port 5173 - DO NOT start it again
2. **Field naming**: Use `type` not `requestType` in Socket.IO requests
3. **Authentication**: Location auth first, password fallback for `'koti2025'`
4. **Service boundaries**: Don't mix service responsibilities  
5. **Log separation**: Backend vs frontend logs in different tables
6. **Hot reload**: Backend auto-restarts on file changes via nodemon
7. **Production URL**: `https://kodinohjaus.fi` serves both API and React app
8. **Mobile access**: Dev server accessible at `http://81.88.23.96:5173/` for mobile testing