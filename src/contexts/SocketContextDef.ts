/**
 * 🔒 CRITICAL: Socket Context Definition
 * 
 * Separated from Provider for Vite Fast Refresh compatibility.
 * Contains only context definition and types.
 */

import { createContext } from "react";
import { SocketService } from "../services/SocketService";

export interface SocketContextValue {
  service: SocketService;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError?: string;
}

export const SocketContext = createContext<SocketContextValue | null>(null);