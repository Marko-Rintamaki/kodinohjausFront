import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  LinearProgress,
  Button,
  Stack
} from '@mui/material';
import {
  Lightbulb,
  Thermostat,
  ElectricBolt,
  Settings,
  WifiOff,
  CheckCircle
} from '@mui/icons-material';
import { sendControlCommand } from '../helpers/socketHelper';
import { useAppSocket } from '../hooks/useAppSocket';
import TrendsSection from '../components/TrendsSection';

const Overview: React.FC = () => {
  const { systemStatus, loading, error, authStatus } = useAppSocket({
    autoAuth: true,
    authRetries: 2,
    fallbackMs: 5000,
    useStatusAsInitial: true,
    overviewQuery: true
  });
  const [tempLoading, setTempLoading] = useState(false);
  const [tempError, setTempError] = useState<string | null>(null);
  const [temperaturesResult, setTemperaturesResult] = useState<any>(null);
  const [lastTempToken, setLastTempToken] = useState<string | null>(null);

  // Poistettu oma init; hook hoitaa kaiken

  const fetchTemperatures = async () => {
    setTempLoading(true);
    setTempError(null);
    setTemperaturesResult(null);
  const tokenNow = localStorage.getItem('authToken');
    setLastTempToken(tokenNow);
    try {
      const res = await sendControlCommand({
        id: 'temperatures',
        function: 'getTemperatures',
        path: ''
      });
      setTemperaturesResult(res);
      if (!res?.success) {
        setTempError(res?.error || 'Tuntematon virhe');
      }
    } catch (e: any) {
      setTempError(e.message || 'Komento epäonnistui');
    } finally {
      setTempLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {authStatus === 'checking' ? 'Tarkistetaan autentikointia...' : 'Ladataan järjestelmän tietoja...!'}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        {authStatus === 'unauthenticated' && (
          <Alert severity="info">
            Varmista, että olet kotisi lähellä (alle 1km) ja salli sijaintitiedot.
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" component="h1">
          Trendit ja tilastot
        </Typography>
        <Chip
          avatar={<Avatar>{systemStatus?.connected ? <CheckCircle /> : <WifiOff />}</Avatar>}
          label={systemStatus?.connected ? 'Yhdistetty' : 'Ei yhteyttä'}
          color={systemStatus?.connected ? 'success' : 'error'}
        />
      </Box>

      {systemStatus && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Valaistus kortti */}
          <Box sx={{ flex: '1 1 240px', maxWidth: 360 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <Lightbulb />
                  </Avatar>
                  <Typography variant="h6">Valaistus</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {systemStatus.lighting.on}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / {systemStatus.lighting.total} valoa päällä
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(systemStatus.lighting.on / Math.max(systemStatus.lighting.total, 1)) * 100}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Box>

          {/* Lämmitys kortti */}
          <Box sx={{ flex: '1 1 240px', maxWidth: 360 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                    <Thermostat />
                  </Avatar>
                  <Typography variant="h6">Lämmitys</Typography>
                </Box>
                <Typography variant="h4" color="secondary">
                  {systemStatus.heating.temperature}°C
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tavoite: {systemStatus.heating.target}°C
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(systemStatus.heating.temperature / systemStatus.heating.target) * 100}
                  sx={{ mt: 1 }}
                  color="secondary"
                />
              </CardContent>
            </Card>
          </Box>

          {/* Sähkö kortti */}
          <Box sx={{ flex: '1 1 240px', maxWidth: 360 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <ElectricBolt />
                  </Avatar>
                  <Typography variant="h6">Sähkö</Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  {systemStatus.electric.consumption}W
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Kulutus
                </Typography>
                {systemStatus.electric.production > 0 && (
                  <Typography variant="body2" color="success.main">
                    Tuotanto: {systemStatus.electric.production}W
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Tilastot kortti */}
          <Box sx={{ flex: '1 1 240px', maxWidth: 360 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <Settings />
                  </Avatar>
                  <Typography variant="h6">Tila</Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Järjestelmä toimii normaalisti
                </Typography>
                <Chip
                  label="Automaatio päällä"
                  color="success"
                  size="small"
                  sx={{ mb: 1 }}
                />
              </CardContent>
            </Card>
          </Box>
  </Box>
      )}

      <Box mt={3}>
        <Typography variant="body2" color="text.secondary">
          Viimeksi päivitetty: {new Date().toLocaleString('fi-FI')}
        </Typography>
      </Box>

      {/* Lämpötila testikomennon alue */}
      <Box mt={5}>
        <Typography variant="h5" gutterBottom>Lämpötilatesti</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Lähettää control-komennon {`{ id: 'temperatures', function: 'getTemperatures' }`} ja näyttää vastauksen. Uudelleenyritys & re-auth sisäänrakennettu helperissä.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Button variant="contained" onClick={fetchTemperatures} disabled={tempLoading}>
            {tempLoading ? 'Haetaan...' : 'Hae lämpötilat'}
          </Button>
          {lastTempToken && (
            <Chip label={`Token käytössä: ${lastTempToken.substring(0,12)}...`} size="small" />
          )}
        </Stack>
        {tempError && (
          <Alert severity="error" sx={{ mb:2 }}>{tempError}</Alert>
        )}
        {temperaturesResult && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Tulos</Typography>
              <pre style={{ margin:0, maxHeight:240, overflow:'auto' }}>{JSON.stringify(temperaturesResult, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </Box>

  {/* Trendit */}
  <TrendsSection />
    </Box>
  );
};

export default Overview;
