/**
 * 🔒 CRITICAL: Socket Context Provider
 * 
 * Provides single Socket.IO instance across entire app via React Context.
 * Handles automatic connection, authentication, and cleanup.
 * 
 * Usage:
 * 1. Wrap App in <SocketProvider>
 * 2. Use useSocketService() hook in components
 * 3. Socket automatically connects and authenticates
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SocketService } from "../services/SocketService";
import { SocketContext, SocketContextValue } from "./SocketContextDef";

interface SocketProviderProps {
  children: React.ReactNode;
  url?: string;
  token?: string;
  autoAuth?: boolean; // Automatically try authentication on connect
}

export function SocketProvider({ 
  children, 
  url = "https://kodinohjaus.fi", 
  token,
  autoAuth = true 
}: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string>();

  // Status update throttling
  const lastStatusUpdateRef = useRef(0);

  // Create service instance (memoized to prevent recreation)
  const service = useMemo(() => {
    console.log('🔌 Creating SocketService for:', url);
    return new SocketService(url, { 
      transports: ["websocket", "polling"],
      forceNew: true 
    });
  }, [url]);

  useEffect(() => {
    console.log('🔌 SocketProvider: Setting up connection...');
    setConnectionStatus('connecting');

    const socket = service.connect();

    // Connection event handlers
    const onConnect = () => {
      console.log('🔌 SocketProvider: Connected successfully');
      setIsConnected(true);
      setConnectionStatus('connected');
      setLastError(undefined);

      // Auto-authenticate if token is available and enabled
      if (autoAuth && token) {
        console.log('🔐 SocketProvider: Auto-authenticating with stored token...');
        service.authenticate({ token });
      }
    };

    const onDisconnect = (reason: string) => {
      console.warn('⚠️ SocketProvider: Disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    const onConnectError = (error: Error) => {
      console.error('❌ SocketProvider: Connection error:', error);
      setIsConnected(false);
      setConnectionStatus('error');
      setLastError(error.message);
    };

    const onError = (error: string) => {
      console.error('❌ SocketProvider: Socket error:', error);
      setLastError(error);
    };

    // Status update throttling (max once per 10 seconds)
    const STATUS_UPDATE_THROTTLE = 10000; // 10 seconds

    const onStatusUpdate = (status: Record<string, unknown>) => {
      const now = Date.now();
      if (now - lastStatusUpdateRef.current >= STATUS_UPDATE_THROTTLE) {
        console.log('📊 Global Status Update:', status);
        lastStatusUpdateRef.current = now;
      }
    };

    // Authentication event handlers
    const onAuthSuccess = (data: { token: string; user: Record<string, unknown> }) => {
      console.log('🔐 SocketProvider: Authentication successful');
      // Store token if received from backend
      if (data.token && data.token !== token) {
        localStorage.setItem('authToken', data.token);
      }
    };

    const onAuthFailed = (error: string) => {
      console.error('🔐 SocketProvider: Authentication failed:', error);
      // Clear invalid token
      localStorage.removeItem('authToken');
    };

    // Setup event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('error', onError);
    socket.on('statusUpdate', onStatusUpdate);
    socket.on('auth:ok', onAuthSuccess);
    socket.on('auth:failed', onAuthFailed);

    // Cleanup function
    return () => {
      console.log('🔌 SocketProvider: Cleaning up...');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('error', onError);
      socket.off('statusUpdate', onStatusUpdate);
      socket.off('auth:ok', onAuthSuccess);
      socket.off('auth:failed', onAuthFailed);
      
      // Don't disconnect in SPA - keep connection alive
      // service.disconnect();
    };
  }, [service, token, autoAuth]);

  const contextValue: SocketContextValue = {
    service,
    isConnected,
    connectionStatus,
    lastError
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// Hooks moved to separate file for Vite Fast Refresh compatibility
// Import hooks from: ../hooks/useSocket.ts