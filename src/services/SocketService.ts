/**
 * 🔒 CRITICAL: Socket.IO Service with TypeScript Events
 * 
 * Single Socket.IO instance shared across the entire app via Context.
 * No duplicate connections, proper event typing, and clean lifecycle management.
 * 
 * Based on recommended architecture pattern for React + Socket.IO apps.
 */

import { io, Socket } from "socket.io-client";
import { Request, Response, AuthLocation } from "../types/socket";

// Backend event types (what backend sends to frontend)
type ServerToClientEvents = {
  "response": (response: Response) => void;
  "statusUpdate": (status: Record<string, unknown>) => void;
  "auth:ok": (data: { token: string; user: Record<string, unknown> }) => void;
  "auth:failed": (error: string) => void;
  "controller:update": (data: Record<string, unknown>) => void;
  "error": (error: string) => void;
};

// Frontend event types (what frontend sends to backend)  
type ClientToServerEvents = {
  "request": (request: Request) => void;
  "auth:login": (data: { token?: string; location?: AuthLocation; password?: string }) => void;
  "heartbeat": () => void;
};

export class SocketService {
  private socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
  private url: string;
  private opts?: Parameters<typeof io>[1];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(url: string, opts?: Parameters<typeof io>[1]) {
    this.url = url;
    this.opts = { 
      autoConnect: false, 
      transports: ["websocket", "polling"],
      forceNew: true,
      ...opts 
    };
    
    console.log('🔌 SocketService created for:', url);
  }

  /**
   * 🔒 CRITICAL: Connect to backend
   * Creates socket instance if needed and connects
   */
  connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!this.socket) {
      console.log('🔌 Creating new socket instance...');
      this.socket = io(this.url, this.opts);
      this.setupEventHandlers();
    }
    
    if (!this.socket.connected) {
      console.log('🔌 Connecting to backend...');
      this.socket.connect();
    }
    
    return this.socket;
  }

  /**
   * Get socket instance (must call connect() first)
   */
  get instance(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!this.socket) {
      throw new Error("Socket not initialized. Call connect() first.");
    }
    return this.socket;
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Disconnect from backend
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from backend...');
      this.socket.disconnect();
    }
  }

  /**
   * Setup automatic event handlers for logging and reconnection
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Connected to backend successfully');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Disconnected from backend:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Log all responses for debugging
    this.socket.on('response', (response) => {
      console.log('📨 Received response:', response);
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    this.reconnectAttempts++;
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * 🔒 CRITICAL: Send request to backend (backward compatibility)
   * 
   * Maintains compatibility with existing Request/Response interfaces
   * while using the new typed socket system.
   */
  async sendRequest(request: Request): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to backend'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      // Listen for response once
      const responseHandler = (response: Response) => {
        clearTimeout(timeout);
        this.socket?.off('response', responseHandler);
        resolve(response);
      };

      this.socket.on('response', responseHandler);
      this.socket.emit('request', request);
    });
  }

  /**
   * Send authentication request using backend Request format
   */
  async authenticateAsync(data: { token?: string; location?: AuthLocation; password?: string }): Promise<Response> {
    console.log('🔐 Sending authentication request...');
    
    // Create proper Request object based on provided data
    let request: Request;
    
    if (data.token) {
      request = {
        type: 'verify_token',
        token: data.token
      };
    } else if (data.location) {
      request = {
        type: 'auth_location',
        location: data.location
      };
    } else if (data.password) {
      request = {
        type: 'auth_password',
        password: data.password
      };
    } else {
      throw new Error('No authentication data provided');
    }

    console.log('🔐 Sending request:', request);
    return await this.sendRequest(request);
  }

  /**
   * Backward compatibility method 
   */
  authenticate(data: { token?: string; location?: AuthLocation; password?: string }): void {
    this.authenticateAsync(data).catch(error => {
      console.error('🔐 Authentication error:', error);
    });
  }

  /**
   * Subscribe to status updates with automatic cleanup
   */
  onStatusUpdate(callback: (status: Record<string, unknown>) => void): () => void {
    if (!this.socket) {
      return () => {};
    }

    this.socket.on('statusUpdate', callback);
    
    // Return cleanup function
    return () => {
      this.socket?.off('statusUpdate', callback);
    };
  }


}