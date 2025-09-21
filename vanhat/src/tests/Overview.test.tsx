import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import Overview from '../pages/Overview';
import { initializeSocket, sendQuery, disconnectSocket } from '../helpers/socketHelper';
import { attemptAuthentication, isTokenValid, getStoredToken } from '../helpers/authHelper';

// Mock helpers
vi.mock('../helpers/socketHelper');
vi.mock('../helpers/authHelper');

const mockInitializeSocket = vi.mocked(initializeSocket);
const mockSendQuery = vi.mocked(sendQuery);
const mockDisconnectSocket = vi.mocked(disconnectSocket);
const mockAttemptAuthentication = vi.mocked(attemptAuthentication);
const mockIsTokenValid = vi.mocked(isTokenValid);
const mockGetStoredToken = vi.mocked(getStoredToken);

// Mock socket instance
const mockSocket = {
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn()
};

describe('Overview Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeSocket.mockReturnValue(mockSocket as any);
    mockGetStoredToken.mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  test('renders loading state initially', () => {
    mockIsTokenValid.mockReturnValue(true);
    
    renderWithRouter(<Overview />);
    
    expect(screen.getByText(/Ladataan järjestelmän tietoja/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('authenticates when token is invalid', async () => {
    mockIsTokenValid.mockReturnValue(false);
    mockAttemptAuthentication.mockResolvedValue({
      success: true,
      token: 'new-token',
      message: 'Authentication successful'
    });

    renderWithRouter(<Overview />);

    await waitFor(() => {
      expect(mockAttemptAuthentication).toHaveBeenCalled();
    });

    expect(mockInitializeSocket).toHaveBeenCalledWith('test-token', expect.any(Object));
  });

  test('shows error when authentication fails', async () => {
    mockIsTokenValid.mockReturnValue(false);
    mockAttemptAuthentication.mockResolvedValue({
      success: false,
      error: 'Authentication failed'
    });

    renderWithRouter(<Overview />);

    await waitFor(() => {
      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Varmista, että olet kotisi lähellä/)).toBeInTheDocument();
  });

  test('initializes socket with correct callbacks when token is valid', async () => {
    mockIsTokenValid.mockReturnValue(true);

    renderWithRouter(<Overview />);

    await waitFor(() => {
      expect(mockInitializeSocket).toHaveBeenCalledWith('test-token', expect.objectContaining({
        onConnect: expect.any(Function),
        onDisconnect: expect.any(Function),
        onDataQueryResponse: expect.any(Function),
        onError: expect.any(Function)
      }));
    });
  });

  test('handles socket connection and fetches system status', async () => {
    mockIsTokenValid.mockReturnValue(true);
    let socketCallbacks: any = {};

    mockInitializeSocket.mockImplementation((_token, callbacks) => {
      socketCallbacks = callbacks;
      return mockSocket as any;
    });

    renderWithRouter(<Overview />);

    await waitFor(() => {
      expect(mockInitializeSocket).toHaveBeenCalled();
    });

    // Simulate socket connection
    socketCallbacks.onConnect();

    expect(mockSendQuery).toHaveBeenCalledWith({
      type: 'overview',
      timestamp: expect.any(Number)
    });
  });

  test('displays system status when data is received', async () => {
    mockIsTokenValid.mockReturnValue(true);
    let socketCallbacks: any = {};

    mockInitializeSocket.mockImplementation((_token, callbacks) => {
      socketCallbacks = callbacks;
      return mockSocket as any;
    });

    renderWithRouter(<Overview />);

    await waitFor(() => {
      expect(mockInitializeSocket).toHaveBeenCalled();
    });

    // Simulate receiving system data
    const mockSystemData = {
      type: 'overview',
      lighting: { total: 10, on: 5 },
      heating: { temperature: 22, target: 23 },
      electric: { consumption: 1500, production: 800 }
    };

    socketCallbacks.onDataQueryResponse(mockSystemData);

    await waitFor(() => {
      expect(screen.getByText('Kodinohjauskeskus')).toBeInTheDocument();
      expect(screen.getByText('Yhdistetty')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Lights on
      expect(screen.getByText('/ 10 valoa päällä')).toBeInTheDocument();
      expect(screen.getByText('22°C')).toBeInTheDocument();
      expect(screen.getByText('1500W')).toBeInTheDocument();
    });
  });

  test('handles socket disconnection', async () => {
    mockIsTokenValid.mockReturnValue(true);
    let socketCallbacks: any = {};

    mockInitializeSocket.mockImplementation((_token, callbacks) => {
      socketCallbacks = callbacks;
      return mockSocket as any;
    });

    renderWithRouter(<Overview />);

    await waitFor(() => {
      expect(mockInitializeSocket).toHaveBeenCalled();
    });

    // First connect and get data
    socketCallbacks.onConnect();
    const mockSystemData = {
      type: 'overview',
      lighting: { total: 10, on: 5 },
      heating: { temperature: 22, target: 23 },
      electric: { consumption: 1500, production: 800 }
    };
    socketCallbacks.onDataQueryResponse(mockSystemData);

    await waitFor(() => {
      expect(screen.getByText('Yhdistetty')).toBeInTheDocument();
    });

    // Simulate disconnection
    socketCallbacks.onDisconnect();

    await waitFor(() => {
      expect(screen.getByText('Ei yhteyttä')).toBeInTheDocument();
    });
  });

  test('handles socket errors', async () => {
    mockIsTokenValid.mockReturnValue(true);
    let socketCallbacks: any = {};

    mockInitializeSocket.mockImplementation((_token, callbacks) => {
      socketCallbacks = callbacks;
      return mockSocket as any;
    });

    renderWithRouter(<Overview />);

    await waitFor(() => {
      expect(mockInitializeSocket).toHaveBeenCalled();
    });

    // Simulate socket error
    socketCallbacks.onError(new Error('Connection failed'));

    await waitFor(() => {
      expect(screen.getByText(/Yhteysvirhe palvelimeen/)).toBeInTheDocument();
    });
  });

  test('disconnects socket on component unmount', () => {
    mockIsTokenValid.mockReturnValue(true);

    const { unmount } = renderWithRouter(<Overview />);

    unmount();

    expect(mockDisconnectSocket).toHaveBeenCalled();
  });
});
