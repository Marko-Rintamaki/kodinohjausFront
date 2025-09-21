import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Tabs, 
  Tab, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  WbTwilight as TwilightIcon,
  WbSunny as SunnyIcon
} from '@mui/icons-material';

import { isSocketConnected, getSocket } from '../helpers/socketHelper';

// Types based on documentation
interface LightSchedule {
  id?: number;
  relay_id: number;
  action_type: 'block' | 'startup' | 'shutdown';
  weekday: number; // 0=Su, 1=Ma, 2=Ti, 3=Ke, 4=To, 5=Pe, 6=La
  start_time: string; // "HH:MM:SS"
  end_time?: string; // "HH:MM:SS" or null for startup/shutdown
  enabled: boolean;
  description?: string;
}

interface TwilightSetting {
  id?: number;
  relay_id: number;
  weekday: number; // 0-6
  lux_threshold: number;
  allowed_start_time: string; // "HH:MM:SS"
  allowed_end_time: string; // "HH:MM:SS"  
  enabled: boolean;
  description?: string;
}

interface DaylightShutdown {
  id?: number;
  relay_id: number;
  weekday: number; // 0-6 or 7=all days
  max_lux_threshold: number;
  enabled: boolean;
  description?: string;
}

// Constants
const WEEKDAYS = [
  { value: 1, label: 'Maanantai' },
  { value: 2, label: 'Tiistai' },
  { value: 3, label: 'Keskiviikko' },
  { value: 4, label: 'Torstai' },
  { value: 5, label: 'Perjantai' },
  { value: 6, label: 'Lauantai' },
  { value: 0, label: 'Sunnuntai' }
];

const DAYLIGHT_WEEKDAYS = [
  ...WEEKDAYS,
  { value: 7, label: 'Kaikki päivät' }
];

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [lightSchedules, setLightSchedules] = useState<LightSchedule[]>([]);
  const [twilightSettings, setTwilightSettings] = useState<TwilightSetting[]>([]);
  const [daylightShutdowns, setDaylightShutdowns] = useState<DaylightShutdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Socket connection monitoring
  useEffect(() => {
    const checkSocketConnection = () => {
      const connected = isSocketConnected();
      setSocketConnected(connected);
      console.log('[Settings] Socket connection status:', connected);
      
      if (!connected) {
        const socket = getSocket();
        console.log('[Settings] Socket details:', {
          exists: !!socket,
          connected: socket?.connected,
          id: socket?.id
        });
      }
    };

    // Check immediately
    checkSocketConnection();
    
    // Check periodically
    const interval = setInterval(checkSocketConnection, 2000);
    
    return () => clearInterval(interval);
  }, []);  // Load data on mount
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          loadLightSchedules(),
          loadTwilightSettings(), 
          loadDaylightShutdowns()
        ]);
      } catch (err) {
        setError((err as Error).message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, []);

  const loadLightSchedules = async () => {
    try {
      const socket = getSocket();
      if (!socket?.connected) {
        console.error('Socket ei ole yhteydessä');
        return;
      }

      const command = {
        id: "sqlQuery",
        query: "SELECT * FROM ifserver.light_schedules ORDER BY relay_id, weekday, start_time;",
        db: "ifserver"
      };

      socket.once('controlResponse', (response: unknown) => {
        const res = response as { success?: boolean; data?: { result?: LightSchedule[] }; error?: string };
        if (res?.success && res?.data?.result) {
          setLightSchedules(res.data.result);
          console.log('Ladattu aikatauluja:', res.data.result.length);
        } else {
          console.error('Virhe ladattaessa aikatauluja:', res?.error);
          setLightSchedules([]);
        }
      });

      socket.emit('control', command);
    } catch (error) {
      console.error('Virhe ladattaessa aikatauluja:', error);
      setLightSchedules([]);
    }
  };

  const loadTwilightSettings = async () => {
    try {
      const socket = getSocket();
      if (!socket?.connected) {
        console.error('Socket ei ole yhteydessä');
        return;
      }

      const command = {
        id: "sqlQuery",
        query: "SELECT * FROM ifserver.twilight_settings ORDER BY relay_id, weekday;",
        db: "ifserver"
      };

      socket.once('controlResponse', (response: unknown) => {
        const res = response as { success?: boolean; data?: { result?: TwilightSetting[] }; error?: string };
        if (res?.success && res?.data?.result) {
          setTwilightSettings(res.data.result);
          console.log('Ladattu hämäräasetuksia:', res.data.result.length);
        } else {
          console.error('Virhe ladattaessa hämäräasetuksia:', res?.error);
          setTwilightSettings([]);
        }
      });

      socket.emit('control', command);
    } catch (error) {
      console.error('Virhe ladattaessa hämäräasetuksia:', error);
      setTwilightSettings([]);
    }
  };

  const loadDaylightShutdowns = async () => {
    try {
      const socket = getSocket();
      if (!socket?.connected) {
        console.error('Socket ei ole yhteydessä');
        return;
      }

      const command = {
        id: "sqlQuery",
        query: "SELECT * FROM ifserver.daylight_shutdowns ORDER BY relay_id, weekday;",
        db: "ifserver"
      };

      socket.once('controlResponse', (response: unknown) => {
        const res = response as { success?: boolean; data?: { result?: DaylightShutdown[] }; error?: string };
        if (res?.success && res?.data?.result) {
          setDaylightShutdowns(res.data.result);
          console.log('Ladattu päivänvaloasetuksia:', res.data.result.length);
        } else {
          console.error('Virhe ladattaessa päivänvaloasetuksia:', res?.error);
          setDaylightShutdowns([]);
        }
      });

      socket.emit('control', command);
    } catch (error) {
      console.error('Virhe ladattaessa päivänvaloasetuksia:', error);
      setDaylightShutdowns([]);
    }
  };

  const getWeekdayLabel = (weekday: number, includeDaylight = false) => {
    const weekdays = includeDaylight ? DAYLIGHT_WEEKDAYS : WEEKDAYS;
    return weekdays.find(w => w.value === weekday)?.label || `Weekday ${weekday}`;
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // "HH:MM:SS" -> "HH:MM"
  };

  // TODO: Add CRUD functions for managing lighting schedules

  const renderLightSchedulesTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">🕐 Aikataulut (Light Schedules)</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled
        >
          Lisää aikataulu (TODO)
        </Button>
      </Box>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Block:</strong> Estää manuaalisen käytön aikavälillä<br/>
          <strong>Startup/Shutdown:</strong> Automaattinen sytytys/sammutus kerran päivässä
        </Typography>
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rele</TableCell>
              <TableCell>Tyyppi</TableCell>
              <TableCell>Viikonpäivä</TableCell>
              <TableCell>Alkuaika</TableCell>
              <TableCell>Loppuaika</TableCell>
              <TableCell>Tila</TableCell>
              <TableCell>Kuvaus</TableCell>
              <TableCell align="right">Toiminnot</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lightSchedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{schedule.relay_id}</TableCell>
                <TableCell>
                  <Chip 
                    label={schedule.action_type}
                    color={schedule.action_type === 'block' ? 'error' : 'primary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{getWeekdayLabel(schedule.weekday)}</TableCell>
                <TableCell>{formatTime(schedule.start_time)}</TableCell>
                <TableCell>{schedule.end_time ? formatTime(schedule.end_time) : '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={schedule.enabled ? 'Käytössä' : 'Pois käytöstä'}
                    color={schedule.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{schedule.description || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    disabled
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => console.log('Delete schedule', schedule.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {lightSchedules.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">Ei aikatauluja määritelty</Typography>
        </Box>
      )}
    </Box>
  );

  const renderTwilightTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">🌙 Hämäräkytkimet (Twilight Settings)</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled
        >
          Lisää hämäräkytkin (TODO)
        </Button>
      </Box>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Hämäräkytkin sytyttää valot automaattisesti kun lux-arvo laskee kynnyksen alle aikaikkunan sisällä.
          Aikaikkunan ulkopuolella valot sammutetaan pakkosammutuksella.
        </Typography>
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rele</TableCell>
              <TableCell>Viikonpäivä</TableCell>
              <TableCell>Lux kynnys</TableCell>
              <TableCell>Alkuaika</TableCell>
              <TableCell>Loppuaika</TableCell>
              <TableCell>Tila</TableCell>
              <TableCell>Kuvaus</TableCell>
              <TableCell align="right">Toiminnot</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {twilightSettings.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell>{setting.relay_id}</TableCell>
                <TableCell>{getWeekdayLabel(setting.weekday)}</TableCell>
                <TableCell>{setting.lux_threshold} lux</TableCell>
                <TableCell>{formatTime(setting.allowed_start_time)}</TableCell>
                <TableCell>{formatTime(setting.allowed_end_time)}</TableCell>
                <TableCell>
                  <Chip 
                    label={setting.enabled ? 'Käytössä' : 'Pois käytöstä'}
                    color={setting.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{setting.description || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small"
                    disabled
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => console.log('Delete twilight', setting.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {twilightSettings.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">Ei hämäräkytkimiä määritelty</Typography>
        </Box>
      )}
    </Box>
  );

  const renderDaylightTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">🌞 Päivänvalo sammutus (Daylight Shutdowns)</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled
        >
          Lisää päivänvalo sammutus (TODO)
        </Button>
      </Box>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Päivänvalo sammutus sammuttaa valot automaattisesti kun on liian valoisa (lux {'>'}  kynnys).
          Toimii 24/7 eikä rajoitu aikaikkunaan.
        </Typography>
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rele</TableCell>
              <TableCell>Viikonpäivä</TableCell>
              <TableCell>Max lux kynnys</TableCell>
              <TableCell>Tila</TableCell>
              <TableCell>Kuvaus</TableCell>
              <TableCell align="right">Toiminnot</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {daylightShutdowns.map((shutdown) => (
              <TableRow key={shutdown.id}>
                <TableCell>{shutdown.relay_id}</TableCell>
                <TableCell>{getWeekdayLabel(shutdown.weekday, true)}</TableCell>
                <TableCell>{shutdown.max_lux_threshold} lux</TableCell>
                <TableCell>
                  <Chip 
                    label={shutdown.enabled ? 'Käytössä' : 'Pois käytöstä'}
                    color={shutdown.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{shutdown.description || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small"
                    disabled
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => console.log('Delete daylight', shutdown.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {daylightShutdowns.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">Ei päivänvalo sammutuksia määritelty</Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box className="container mx-auto px-4 py-8">
      <Typography variant="h4" component="h1" gutterBottom>
        Asetukset
      </Typography>
      
      {!socketConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>WebSocket-yhteys ei ole käytettävissä</strong><br />
          Asetuksia ei voida muokata. Socket connected: {socketConnected ? 'Kyllä' : 'Ei'}<br />
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                console.log('[Settings] Manual auth retry requested');
                (window as any).retryAuth?.();
              }}
            >
              Yritä autentikointia uudestaan
            </Button>
          </Box>
        </Alert>
      )}
      
      {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab icon={<ScheduleIcon />} label="Aikataulut" />
                <Tab icon={<TwilightIcon />} label="Hämäräkytkimet" />
                <Tab icon={<SunnyIcon />} label="Päivänvalo sammutus" />
              </Tabs>
            </Box>
            
            {loading && (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            )}
            
            <Box mt={3}>
              {tabValue === 0 && renderLightSchedulesTab()}
              {tabValue === 1 && renderTwilightTab()}
              {tabValue === 2 && renderDaylightTab()}
            </Box>
          </CardContent>
        </Card>

        {/* TODO: Add dialogs for creating/editing settings */}
      </Box>
  );
};

export default Settings;
