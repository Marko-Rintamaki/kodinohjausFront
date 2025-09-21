import React from 'react';
import { Box, Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Navbar from './Navbar';

// Luo custom teema
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  // ViewTogglePanel props for navbar
  hideHeatingPipes?: boolean;
  onHideHeatingPipesChange?: (hide: boolean) => void;
  hideLEDStrips?: boolean;
  onHideLEDStripsChange?: (hide: boolean) => void;
  hideLamps?: boolean;
  onHideLampsChange?: (hide: boolean) => void;
  hideTemperatureIcons?: boolean;
  onHideTemperatureIconsChange?: (hide: boolean) => void;
  hideWallLights?: boolean;
  onHideWallLightsChange?: (hide: boolean) => void;
  hideHeatPumps?: boolean;
  onHideHeatPumpsChange?: (hide: boolean) => void;
}

export default function Layout({ 
  children, 
  title = 'Kodinohjaus', 
  maxWidth = 'lg',
  // ViewTogglePanel props
  hideHeatingPipes,
  onHideHeatingPipesChange,
  hideLEDStrips,
  onHideLEDStripsChange,
  hideLamps,
  onHideLampsChange,
  hideTemperatureIcons,
  onHideTemperatureIconsChange,
  hideWallLights,
  onHideWallLightsChange,
  hideHeatPumps,
  onHideHeatPumpsChange,
}: LayoutProps) {
  // Aseta sivun title
  React.useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Navbar 
          hideHeatingPipes={hideHeatingPipes}
          onHideHeatingPipesChange={onHideHeatingPipesChange}
          hideLEDStrips={hideLEDStrips}
          onHideLEDStripsChange={onHideLEDStripsChange}
          hideLamps={hideLamps}
          onHideLampsChange={onHideLampsChange}
          hideTemperatureIcons={hideTemperatureIcons}
          onHideTemperatureIconsChange={onHideTemperatureIconsChange}
          hideWallLights={hideWallLights}
          onHideWallLightsChange={onHideWallLightsChange}
          hideHeatPumps={hideHeatPumps}
          onHideHeatPumpsChange={onHideHeatPumpsChange}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 3,
          }}
        >
          <Container maxWidth={maxWidth}>
            {children}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
