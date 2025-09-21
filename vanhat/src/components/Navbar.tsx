
import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  FormControlLabel,
  Checkbox,
  Paper,
} from '@mui/material';
import { Menu as MenuIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Koti' },
  { to: '/trends', label: 'Trendit' },
  { to: '/heating', label: 'Lämmitys' },
  { to: '/electric', label: 'Sähkö' },
  { to: '/settings', label: 'Asetukset' },
  { to: '/test', label: 'Testit' },
];

interface NavbarProps {
  // ViewTogglePanel props
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

export default function Navbar({
  hideHeatingPipes = false,
  onHideHeatingPipesChange,
  hideLEDStrips = false,
  onHideLEDStripsChange,
  hideLamps = false,
  onHideLampsChange,
  hideTemperatureIcons = false,
  onHideTemperatureIconsChange,
  hideWallLights = false,
  onHideWallLightsChange,
  hideHeatPumps = false,
  onHideHeatPumpsChange,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<HTMLElement | null>(null);
  const location = useLocation();

  // Tunnista jos ollaan sähkötyön sivustolla ja lisää /kodinohjaus prefiksi
  const isOnElectricalSite = window.location.hostname === 'sahkorintamaki.fi';
  
  // Luo dynaaminen linkki joka lisää prefiksin tarvittaessa
  const createDynamicLink = (originalPath: string) => {
    if (isOnElectricalSite) {
      // Jos ollaan sähkötyön sivustolla, lisää /kodinohjaus prefiksi
      return `/kodinohjaus${originalPath}`;
    }
    // Muuten käytä alkuperäistä polkua
    return originalPath;
  };

  // Luo dynaamiset navLinkit
  const dynamicNavLinks = navLinks.map(link => ({
    ...link,
    to: createDynamicLink(link.to)
  }));

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleStatusClick = () => {
    // Lähetetään custom event joka kertoo Home.tsx:lle että avaa StatusModal
    window.dispatchEvent(new CustomEvent('openStatusModal'));
  };

  const handleViewMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setViewMenuAnchor(event.currentTarget);
  };

  const handleViewMenuClose = () => {
    setViewMenuAnchor(null);
  };

  const isViewMenuOpen = Boolean(viewMenuAnchor);

  // Show visibility controls on home page
  const showViewControls = (location.pathname === '/') && (
    onHideHeatingPipesChange || onHideLEDStripsChange || onHideLampsChange ||
    onHideTemperatureIconsChange || onHideWallLightsChange || onHideHeatPumpsChange
  );

  return (
    <>
            <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: 100,
          backgroundColor: '#f8fafc', // White background like before
          color: '#1f2937', // Dark text
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          '& .MuiToolbar-root': {
            touchAction: 'manipulation', // Allow taps on AppBar elements
            minHeight: {
              xs: 'var(--appbar-height-mobile, 56px)',
              sm: 'var(--appbar-height, 64px)'
            }
          },
          '@media (max-width: 780px) and (orientation: landscape)': {
            backgroundColor: 'rgba(248, 250, 252, 0.85)',
            backdropFilter: 'blur(10px)',
            '& .MuiToolbar-root': {
              minHeight: 'var(--appbar-height-landscape, 40px)',
              padding: '0 8px',
            }
          },
          '@media (max-height: 500px)': {
            backgroundColor: 'rgba(248, 250, 252, 0.85)',
            backdropFilter: 'blur(10px)',
            '& .MuiToolbar-root': {
              minHeight: 'var(--appbar-height-landscape, 40px)',
              padding: '0 8px',
            }
          }
        }}
      >
        <Toolbar
          sx={{
            // Compact toolbar in landscape/small height
            '@media (max-width: 780px) and (orientation: landscape)': {
              minHeight: '40px !important',
              paddingLeft: '8px !important',
              paddingRight: '8px !important',
            },
            '@media (max-height: 500px)': {
              minHeight: '40px !important',
              paddingLeft: '8px !important',
              paddingRight: '8px !important',
            }
          }}
        >
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              color: '#1f2937', // Dark text color like before
              fontWeight: 700,
              // Smaller text in landscape
              '@media (max-width: 780px) and (orientation: landscape)': {
                fontSize: '1rem',
              },
              '@media (max-height: 500px)': {
                fontSize: '1rem',
              }
            }}
          >
            Kodinohjaus
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            {dynamicNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  color: location.pathname === link.to ? '#1976d2' : '#374151',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '1rem',
                  padding: '6px 12px',
                  borderRadius: 4,
                  background: location.pathname === link.to ? 'rgba(25, 118, 210, 0.08)' : 'none',
                  transition: 'background 0.2s',
                }}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Visibility controls for desktop */}
            {showViewControls && (
              <IconButton
                size="large"
                color="inherit"
                aria-label="visibility"
                onClick={handleViewMenuClick}
                sx={{ 
                  color: '#1976d2',
                  ml: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  }
                }}
              >
                <VisibilityIcon />
              </IconButton>
            )}
          </Box>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1 }}>
            {/* Status button for mobile */}
            <IconButton
              size="large"
              color="inherit"
              aria-label="status"
              onClick={handleStatusClick}
              sx={{ color: '#1976d2' }}
            >
              🌡️
            </IconButton>
            
            {/* Visibility controls for mobile */}
            {showViewControls && (
              <IconButton
                size="large"
                color="inherit"
                aria-label="visibility"
                onClick={handleViewMenuClick}
                sx={{ color: '#1976d2' }}
              >
                <VisibilityIcon />
              </IconButton>
            )}
            
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          </Box>
          <Drawer
            anchor="right"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            sx={{ display: { xs: 'block', md: 'none' } }}
          >
            <Box
              sx={{ width: 220 }}
              role="presentation"
              onClick={handleDrawerToggle}
              onKeyDown={handleDrawerToggle}
            >
              <List>
                {dynamicNavLinks.map((link) => (
                  <ListItem key={link.to} disablePadding>
                    <ListItemButton
                      component={Link}
                      to={link.to}
                      sx={{
                        color: location.pathname === link.to ? '#1976d2' : '#374151',
                        background: location.pathname === link.to ? 'rgba(25, 118, 210, 0.08)' : 'none',
                        '&:hover': {
                          background: 'rgba(25, 118, 210, 0.08)',
                        },
                      }}
                    >
                      <ListItemText primary={link.label} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>
          
          {/* Visibility Controls Popover */}
          <Popover
            open={isViewMenuOpen}
            anchorEl={viewMenuAnchor}
            onClose={handleViewMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Paper sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem', color: '#374151' }}>
                👁️ Näkyvyys
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {onHideHeatingPipesChange && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!hideHeatingPipes}
                        onChange={(e) => onHideHeatingPipesChange(!e.target.checked)}
                        size="small"
                      />
                    }
                    label="🔥 Lämmitys"
                    sx={{ fontSize: '0.875rem' }}
                  />
                )}
                
                {onHideLEDStripsChange && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!hideLEDStrips}
                        onChange={(e) => onHideLEDStripsChange(!e.target.checked)}
                        size="small"
                      />
                    }
                    label="💡 LED-nauhat"
                    sx={{ fontSize: '0.875rem' }}
                  />
                )}
                
                {onHideLampsChange && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!hideLamps}
                        onChange={(e) => onHideLampsChange(!e.target.checked)}
                        size="small"
                      />
                    }
                    label="🏮 Lamput"
                    sx={{ fontSize: '0.875rem' }}
                  />
                )}
                
                {onHideWallLightsChange && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!hideWallLights}
                        onChange={(e) => onHideWallLightsChange(!e.target.checked)}
                        size="small"
                      />
                    }
                    label="💡 Seinävalot"
                    sx={{ fontSize: '0.875rem' }}
                  />
                )}
                
                {onHideTemperatureIconsChange && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!hideTemperatureIcons}
                        onChange={(e) => onHideTemperatureIconsChange(!e.target.checked)}
                        size="small"
                      />
                    }
                    label="🌡️ Lämpötilat"
                    sx={{ fontSize: '0.875rem' }}
                  />
                )}
                
                {onHideHeatPumpsChange && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!hideHeatPumps}
                        onChange={(e) => onHideHeatPumpsChange(!e.target.checked)}
                        size="small"
                      />
                    }
                    label="❄️ Lämpöpumput"
                    sx={{ fontSize: '0.875rem' }}
                  />
                )}
              </Box>
            </Paper>
          </Popover>
        </Toolbar>
      </AppBar>
    </>
  );
}
