/**
 * 🧭 NavigationLayout - Yhteinen sivupohja ja navigointi
 * 
 * Kaikki sivut käyttävät tätä layoutia joka tarjoaa:
 * - Socket.IO yhteys ja autentikointi
 * - Yhteinen navigointipalkki
 * - Status updatet kaikilla sivuilla
 * - Responsiivinen layout
 */

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Chip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useSocketService } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';

// Material-UI teema - sama kuin vanhassa Layout.tsx:ssä
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

export const NavigationLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connectionStatus } = useSocketService();
  const { isAuthenticated, isLoading, error, tryLocationAuth, authenticateWithPassword } = useAuth();
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Responsive breakpoint
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  // Navigointi-linkit
  const navigationItems = [
    { label: 'Koti', path: '/', icon: <HomeIcon /> },
    { label: 'Trendit', path: '/trends', icon: <TrendingUpIcon /> },
    { label: 'Asetukset', path: '/settings', icon: <SettingsIcon /> }
  ];

  // Yhteyden tila väri
  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': 
      default: return 'error';
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Yhdistetty';
      case 'connecting': return 'Yhdistää...';
      case 'disconnected':
      default: return 'Ei yhteyttä';
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* AppBar */}
        <AppBar position="static" elevation={1}>
          <Toolbar>
            {/* Mobile menu button */}
            {isMobile && (
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setMobileMenuOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            {/* Logo */}
            <Typography 
              variant="h6" 
              sx={{ 
                flexGrow: 1, 
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onClick={() => handleNavigation('/')}
            >
              Kodinohjaus
            </Typography>

            {/* Desktop navigaatio */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {navigationItems.map((item) => (
                  <Button
                    key={item.path}
                    color="inherit"
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      color: location.pathname === item.path ? 'white' : 'rgba(255,255,255,0.7)',
                      backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}

            {/* Status ja auth napit */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2 }}>
              {/* Yhteyden tila */}
              <Chip
                label={getConnectionText()}
                color={getConnectionColor()}
                size="small"
                variant="outlined"
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&.MuiChip-colorSuccess': { 
                    borderColor: 'rgba(76, 175, 80, 0.5)',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                  },
                  '&.MuiChip-colorWarning': { 
                    borderColor: 'rgba(255, 152, 0, 0.5)',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)'
                  },
                  '&.MuiChip-colorError': { 
                    borderColor: 'rgba(244, 67, 54, 0.5)',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                  }
                }}
              />

              {/* Autentikointi */}
              {!isAuthenticated ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={tryLocationAuth}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Tarkistaa...' : 'Sijainti'}
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => authenticateWithPassword('koti2025')}
                    disabled={isLoading}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                  >
                    Salasana
                  </Button>
                </Box>
              ) : (
                <Chip
                  label="✓ Tunnistettu"
                  color="success"
                  size="small"
                  sx={{ color: 'white' }}
                />
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Mobile Drawer */}
        <Drawer
          anchor="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        >
          <Box sx={{ width: 250 }} role="presentation">
            <List>
              {navigationItems.map((item) => (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton 
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                  >
                    <Box sx={{ mr: 2 }}>{item.icon}</Box>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Virhetila */}
        {error && (
          <Box sx={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #f87171', p: 2 }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        )}

        {/* Pääsisältö */}
        <Box component="main" sx={{ flexGrow: 1, backgroundColor: 'background.default' }}>
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};