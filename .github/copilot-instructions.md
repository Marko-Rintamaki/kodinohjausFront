# Kodinohjaus Smart Home System - AI Agent Instructions

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
npm run dev  # Vite dev server on :5173
npm run build  # Production build to dist/
```

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

1. **Field naming**: Use `type` not `requestType` in Socket.IO requests
2. **Authentication**: Location auth first, password fallback for `'koti2025'`
3. **Service boundaries**: Don't mix service responsibilities  
4. **Log separation**: Backend vs frontend logs in different tables
5. **Hot reload**: Backend auto-restarts on file changes via nodemon
6. **Production URL**: `https://kodinohjaus.fi` serves both API and React app