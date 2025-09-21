// YKSINKERTAINEN - backend rajapinta

/**
 * 🔒 LOCKED: Socket Types - Must Match Backend RequestHandler.ts
 * 
 * These types are synchronized with backend RequestHandler.ts
 * DO NOT MODIFY without verifying backend compatibility
 */

export interface Request {
  type: 'auth_location' | 'auth_password' | 'verify_token' | 'sql_query' | 'database_query' | 'database_write' | 'controller_command' | 'trend_query' | 'get_global_data' | 'get_controller_status' | 'ping';
  data?: DatabaseQueryData | ControllerCommandData | TrendQueryData | Record<string, unknown>;
  token?: string;
  location?: AuthLocation;
  password?: string;
}

export interface Response {
  success: boolean;
  data?: Record<string, unknown> | unknown[];
  error?: string;
  message?: string;
  requiresAuth?: boolean;
}

export interface AuthLocation {
  latitude: number;
  longitude: number;
}

export interface DatabaseQueryData {
  sql?: string;     // For sql_query
  query?: string;   // For database_query  
  params?: unknown[];
}

export interface ControllerCommandData {
  command?: string;
  id?: string;
  value?: unknown;
  [key: string]: unknown;
}

export interface TrendQueryData {
  queryType: 'nilan_trend' | 'electricity_total_trend' | 'electricity_breakdown_trend';
  params: {
    startDate?: string;
    endDate?: string;
    interval?: string;
    [key: string]: unknown;
  };
}