# 🏠 Kodinohjaus Frontend

Modern React-based frontend for the Kodinohjaus smart home system. Connects to the backend at `https://kodinohjaus.fi` via Socket.IO.

## 🎯 Features

- **🔐 Automatic Location-Based Authentication**: Seamless authentication based on proximity to home
- **📡 Real-Time Communication**: Socket.IO connection for instant data updates
- **🏠 Smart Home Control**: Direct controller commands for heat pumps, ventilation, etc.
- **📊 Data Visualization**: Historical trends and real-time monitoring
- **🔄 Token Management**: Automatic token refresh and local storage handling
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices

## 🏗️ Architecture

### Helper System
- **Socket Helper** (`src/helpers/socketHelper.ts`): Manages Socket.IO connection and communication
- **Auth Helper** (`src/helpers/authHelper.ts`): Handles location-based authentication and token management
- **React Hook** (`src/hooks/useAuth.ts`): Provides authentication and socket functionality to components

### Authentication Flow
1. **Automatic Check**: On page load, checks for existing valid token in localStorage
2. **Location Request**: If no valid token, requests user location via browser geolocation API
3. **Proximity Validation**: Verifies user is within 1000m of home coordinates (60.623857, 22.110013)
4. **Backend Authentication**: Sends `authenticate` event with location coordinates to backend
5. **Token Response**: Backend responds with `authResponse` containing JWT token
6. **Token Storage**: Stores JWT token in localStorage with 90-day expiration
7. **Socket Connection**: Establishes authenticated Socket.IO connection

## 🚀 Quick Start

### Development
```bash
cd kodinohjausFront
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

## 🔐 Authentication System

### Location-Based Security
- **Home Coordinates**: 60.623857, 22.110013 (Turku, Finland)
- **Authentication Radius**: 1000 meters
- **Token Validity**: 90 days
- **Development Mode**: Mock location for localhost/codespaces

### Token Management
- **Auto-refresh**: Tokens are automatically renewed when needed
- **Persistent Storage**: Tokens stored in localStorage with expiration tracking
- **Secure Headers**: Tokens sent in Socket.IO auth headers

### Development Environment
- **Mock Location**: Development environments use home coordinates for testing
- **No Domain Restrictions**: Backend handles all authentication logic
- **Console Logging**: Extensive debugging information in development

## 📡 Socket.IO Communication

### Connection
```typescript
// Automatic connection with token
const { sendDataQuery, sendControlCommand } = useAuth();
```

### Authentication Protocol
```typescript
// Backend expects 'authenticate' event with location coordinates
const result = await requestAuthentication(60.623857, 22.110013);

// Backend responds with 'authResponse' event containing JWT token
// Token is automatically stored in localStorage
```

### Database Queries (No Authentication Required)
```typescript
// SQL queries to readonly database
const result = await sendDataQuery({
  queryType: 'sql_query',
  params: {
    query: 'SELECT * FROM ifserver.bosch LIMIT 10',
    parameters: []
  }
});

// Trend data
const trendData = await sendDataQuery({
  queryType: 'nilan_trend',
  params: {
    startDate: '2025-07-30',
    endDate: '2025-07-31'
  }
});
```

### Controller Commands (Authentication Required)
```typescript
// Read controller value
const response = await sendControlCommand({
  id: "Bosch",
  function: "read",
  path: "/dhwCircuits/dhw1/charge"
});

// Write controller value
const response = await sendControlCommand({
  id: "Bosch",
  function: "write",
  path: "/dhwCircuits/dhw1/charge",
  value: 50
});
```

## 🛠️ Usage in Components

### Using the Authentication Hook
```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { 
    isAuthenticated, 
    isLoading, 
    error, 
    sendDataQuery,
    sendControlCommand,
    forceAuth 
  } = useAuth();

  // Component automatically handles authentication
  // Socket connection is established when component mounts
  
  return (
    <div>
      {isAuthenticated ? (
        <button onClick={() => sendControlCommand({...})}>
          Control Device
        </button>
      ) : (
        <p>Authentication required</p>
      )}
    </div>
  );
}
```

### Socket-Only Communication (No Auth)
```typescript
import { useSocket } from './hooks/useAuth';

function ReadOnlyComponent() {
  const { sendDataQuery, isConnected } = useSocket();
  
  // Only for read-only database queries
  // No authentication required
}
```

## 🧪 Testing Features

The main App component includes test buttons for:
- **Authentication Status**: Shows current auth state and token info
- **Database Query**: Tests readonly database access with `dataQuery` event
- **Control Command**: Tests authenticated controller access with `control` event  
- **Force Re-auth**: Forces new authentication attempt with `authenticate` event
- **Debug Mode**: Use mock coordinates for testing authentication
- **Logout**: Clears stored tokens

## 🔧 Configuration

### Environment Detection
- **Production**: `kodinohjaus.fi` domain with real geolocation
- **Development**: `localhost` with mock coordinates for testing
- **Codespaces/Gitpod**: Automatic detection and mock location

### Storage Keys
- `authToken`: JWT authentication token
- `tokenExpiry`: Token expiration timestamp
- `lastAuthAttempt`: Last authentication attempt time

## 🛡️ Security Features

- **Location Validation**: Only users within 1000m of home can authenticate
- **Token Expiration**: Automatic token cleanup when expired
- **Rate Limiting**: Prevents excessive authentication attempts
- **Secure Storage**: Tokens stored with expiration tracking
- **No Plaintext Secrets**: All sensitive authentication handled by backend

## 📊 Backend Integration

Connects to production backend at `https://kodinohjaus.fi`:
- **Read-Only Database**: Public access for monitoring data
- **Authenticated Commands**: Location-verified access for control operations
- **Real-Time Updates**: Socket.IO events for status changes
- **Error Handling**: Comprehensive error reporting and recovery

## 🚨 Error Handling

- **Connection Failures**: Automatic reconnection with exponential backoff
- **Authentication Errors**: Clear user feedback and retry mechanisms
- **Location Errors**: Graceful fallback for unsupported browsers
- **Token Expiry**: Automatic cleanup and re-authentication prompts

## 📱 Device Support

- **Desktop**: Full functionality with geolocation
- **Mobile**: Native geolocation for precise authentication
- **Tablets**: Responsive design with touch-friendly controls
- **Development**: Mock location for testing environments

## 👨‍💻 Development Notes

- **No Domain Restrictions**: Backend handles all authentication logic
- **Mock Locations**: Development environments use home coordinates
- **Console Logging**: Extensive debugging in development mode
- **Hot Reload**: Vite dev server with fast refresh
- **TypeScript**: Full type safety for all helper functions

## 📄 License

Private project - All rights reserved.

## 👤 Author

**Marko Rintamäki**
- Email: marko.rintamaki@hotmail.fi
- Home Automation Enthusiast

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
