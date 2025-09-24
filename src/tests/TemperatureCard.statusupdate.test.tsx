import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SocketProvider } from '../contexts/SocketContext';
import TemperatureCard from '../components/hvac/TemperatureCard';
import * as socketHelper from '../helpers/socketHelper';

// Real statusupdate data from the production system
const realStatusUpdateData = {
  "temperatures": [
    {
      "room": "IV out",
      "value": "9.625"
    },
    {
      "room": "IV in", 
      "value": "22.687"
    },
    {
      "room": "MH2",
      "value": "22.062"
    },
    {
      "room": "MH3",
      "value": "21.625"
    },
    {
      "room": "OHETKT",
      "value": "24.25"
    },
    {
      "room": "MH1",
      "value": "21.875"
    },
    {
      "room": "PHKHH",
      "value": "22.75"
    }
  ],
  "Bosch": [
    {
      "paths": [
        {
          "id": "/dhwCircuits/dhw1/actualTemp",
          "type": "floatValue",
          "writeable": 0,
          "recordable": 0,
          "value": 40,
          "unitOfMeasure": "C",
          "state": [
            {
              "open": -3276.8
            },
            {
              "short": 3276.7
            }
          ],
          "time": "24/09/2025 09:10:38"
        },
        {
          "id": "/heatSources/actualModulation",
          "type": "floatValue",
          "writeable": 0,
          "recordable": 0,
          "value": 100,
          "unitOfMeasure": "%",
          "time": "24/09/2025 09:10:09"
        },
        {
          "id": "/heatSources/returnTemperature",
          "type": "floatValue",
          "writeable": 0,
          "recordable": 0,
          "value": 34.2,
          "unitOfMeasure": "C",
          "state": [
            {
              "open": -3276.8
            },
            {
              "short": 3276.7
            }
          ],
          "time": "24/09/2025 09:10:09"
        },
        {
          "id": "/heatingCircuits/hc1/actualSupplyTemperature",
          "type": "floatValue",
          "writeable": 0,
          "recordable": 0,
          "value": 36.4,
          "unitOfMeasure": "C",
          "state": [
            {
              "open": -3276.8
            },
            {
              "short": 3276.7
            }
          ],
          "time": "24/09/2025 09:10:09"
        }
      ]
    }
  ],
  "Nilan": [
    {
      "registers": [
        {
          "register": "5162",
          "value": "595",
          "time": "24/09/2025 09:10:37"
        },
        {
          "register": "5163",
          "value": "488",
          "time": "24/09/2025 09:10:37"
        },
        {
          "register": "5154",
          "value": "227",
          "time": "24/09/2025 09:10:37"
        },
        {
          "register": "4746",
          "value": "220",
          "time": "24/09/2025 09:10:37"
        },
        {
          "register": "4706",
          "value": "0",
          "time": "24/09/2025 09:10:37"
        },
        {
          "register": "4703",
          "value": "0",
          "time": "24/09/2025 09:10:37"
        },
        {
          "register": "5548",
          "value": "580",
          "time": "24/09/2025 09:10:37"
        },
        {
          "register": "5152",
          "value": 64,
          "time": "24/09/2025 09:10:08"
        },
        {
          "register": "5153",
          "value": 212,
          "time": "24/09/2025 09:10:08"
        },
        {
          "register": "5155",
          "value": 96,
          "time": "24/09/2025 09:10:08"
        },
        {
          "register": "5156",
          "value": 217,
          "time": "24/09/2025 09:10:08"
        },
        {
          "register": "5157",
          "value": 575,
          "time": "24/09/2025 09:10:08"
        }
      ]
    }
  ],
  "relays": [
    {
      "relay": 1,
      "stat": 0
    },
    {
      "relay": 2,
      "stat": 1
    },
    {
      "relay": 3,
      "stat": 0
    },
    {
      "relay": 4,
      "stat": 0
    },
    {
      "relay": 5,
      "stat": 1
    },
    {
      "relay": 6,
      "stat": 0
    },
    {
      "relay": 7,
      "stat": 0
    },
    {
      "relay": 8,
      "stat": 0
    },
    {
      "relay": 9,
      "stat": 1
    },
    {
      "relay": 10,
      "stat": 1
    },
    {
      "relay": 11,
      "stat": 0
    },
    {
      "relay": 12,
      "stat": 0
    },
    {
      "relay": 13,
      "stat": 0
    },
    {
      "relay": 14,
      "stat": 0
    },
    {
      "relay": 15,
      "stat": 0
    },
    {
      "relay": 16,
      "stat": 0
    },
    {
      "relay": 17,
      "stat": 0
    },
    {
      "relay": 18,
      "stat": 0
    },
    {
      "relay": 19,
      "stat": 0
    },
    {
      "relay": 20,
      "stat": 1
    },
    {
      "relay": 21,
      "stat": 0
    },
    {
      "relay": 22,
      "stat": 0
    },
    {
      "relay": 23,
      "stat": 0
    },
    {
      "relay": 24,
      "stat": 0
    },
    {
      "relay": 25,
      "stat": 1
    },
    {
      "relay": 26,
      "stat": 0
    },
    {
      "relay": 27,
      "stat": 0
    },
    {
      "relay": 28,
      "stat": 0
    },
    {
      "relay": 29,
      "stat": 0
    },
    {
      "relay": 30,
      "stat": 0
    },
    {
      "relay": 31,
      "stat": 0
    },
    {
      "relay": 32,
      "stat": 0
    },
    {
      "relay": 33,
      "stat": 0
    },
    {
      "relay": 34,
      "stat": 0
    },
    {
      "relay": 35,
      "stat": 0
    },
    {
      "relay": 36,
      "stat": 0
    },
    {
      "relay": 37,
      "stat": 0
    },
    {
      "relay": 38,
      "stat": 0
    },
    {
      "relay": 39,
      "stat": 0
    },
    {
      "relay": 40,
      "stat": 0
    },
    {
      "relay": 41,
      "stat": 0
    },
    {
      "relay": 42,
      "stat": 0
    },
    {
      "relay": 43,
      "stat": 1
    },
    {
      "relay": 44,
      "stat": 0
    },
    {
      "relay": 45,  
      "stat": 1
    },
    {
      "relay": 46,
      "stat": 1
    },
    {
      "relay": 47,
      "stat": 0
    },
    {
      "relay": 48,
      "stat": 0
    }
  ],
  "requestId": "update"
};

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SocketProvider>
    {children}
  </SocketProvider>
);

describe('TemperatureCard with Real StatusUpdate Data', () => {
  let onUpdateStatusChangeCallback: ((data: unknown) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    onUpdateStatusChangeCallback = null;

    // Mock socket helper functions
    vi.spyOn(socketHelper, 'getUpdateStatus').mockReturnValue(realStatusUpdateData);
    vi.spyOn(socketHelper, 'onUpdateStatusChange').mockImplementation((callback) => {
      onUpdateStatusChangeCallback = callback;
      return () => {}; // cleanup function
    });
    vi.spyOn(socketHelper, 'getSocket').mockReturnValue(mockSocket as never);
    vi.spyOn(socketHelper, 'isSocketConnected').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should extract temperature data from real statusupdate structure', () => {
    render(
      <TestWrapper>
        <TemperatureCard 
          roomId="MH2"
          roomName="Makuuhuone 2"
          authenticated={false}
        />
      </TestWrapper>
    );

    // The card should be rendered
    expect(screen.getByTestId('temperature-card')).toBeInTheDocument();
    
    // Should find MH2 temperature (22.062°C)
    // Note: This might fail if the extractTemperatureData function doesn't work correctly
    expect(screen.getByText(/22\.1/)).toBeInTheDocument();
  });

  it('should handle temperature data with string values', () => {
    render(
      <TestWrapper>
        <TemperatureCard 
          roomId="MH1"
          roomName="Makuuhuone 1"
          authenticated={false}
        />
      </TestWrapper>
    );

    // MH1 temperature is "21.875" as string - should be parsed
    expect(screen.getByTestId('temperature-card')).toBeInTheDocument();
    
    // Look for the parsed temperature value (21.9°C rounded)
    expect(screen.getByText(/21\.9/)).toBeInTheDocument();
  });

  it('should handle IV (ventilation) temperatures', () => {
    render(
      <TestWrapper>
        <TemperatureCard 
          roomId="IV out"
          roomName="IV Ulospuhallus"
          authenticated={false}
        />
      </TestWrapper>
    );

    // IV out temperature is "9.625" - should be displayed
    expect(screen.getByTestId('temperature-card')).toBeInTheDocument();
    expect(screen.getByText(/9\.6/)).toBeInTheDocument();
  });

  it('should handle missing relaysinf gracefully', () => {
    // Real data doesn't have relaysinf field - component should handle this
    render(
      <TestWrapper>
        <TemperatureCard 
          roomId="MH2"
          roomName="Makuuhuone 2"
          authenticated={false}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId('temperature-card')).toBeInTheDocument();
    
    // Should not crash when relaysinf is missing
    // Heating status should default to false/off
    expect(screen.queryByText(/lämmitys päällä/i)).not.toBeInTheDocument();
  });

  it('should react to status updates via callback', async () => {
    render(
      <TestWrapper>
        <TemperatureCard 
          roomId="MH3"
          roomName="Makuuhuone 3"
          authenticated={false}
        />
      </TestWrapper>
    );

    // Initial temperature from MH3: "21.625"
    expect(screen.getByText(/21\.6/)).toBeInTheDocument();

    // Simulate updated data via callback
    const updatedData = {
      ...realStatusUpdateData,
      temperatures: [
        ...realStatusUpdateData.temperatures.filter(t => t.room !== "MH3"),
        {
          "room": "MH3",
          "value": "25.5"
        }
      ]
    };

    // Use React's act() to properly handle state updates
    await import('@testing-library/react').then(({ act }) => {
      act(() => {
        if (onUpdateStatusChangeCallback) {
          onUpdateStatusChangeCallback(updatedData);
        }
      });
    });

    // Should update to new temperature
    expect(screen.getByText(/25\.5/)).toBeInTheDocument();
  });

  it('should handle case-insensitive room matching', () => {
    render(
      <TestWrapper>
        <TemperatureCard 
          roomId="mh2" // lowercase
          roomName="Makuuhuone 2"
          authenticated={false}
        />
      </TestWrapper>
    );

    // Should match "MH2" (uppercase) in data with "mh2" (lowercase) roomId
    expect(screen.getByTestId('temperature-card')).toBeInTheDocument();
    expect(screen.getByText(/22\.1/)).toBeInTheDocument();
  });

  it('should display special room names correctly', () => {
    render(
      <TestWrapper>
        <TemperatureCard 
          roomId="OHETKT"
          roomName="Olohuoneen etukatto"
          authenticated={false}
        />
      </TestWrapper>
    );

    // OHETKT temperature is "24.25"
    expect(screen.getByTestId('temperature-card')).toBeInTheDocument();
    expect(screen.getByText(/24\.3/)).toBeInTheDocument();
  });
});