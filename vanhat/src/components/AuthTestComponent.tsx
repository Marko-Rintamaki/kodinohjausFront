import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent,
  Alert
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useAuthWithFallback } from '../hooks/useAuthWithFallback';
import PasswordAuthDialog from './PasswordAuthDialog';

const AuthTestComponent: React.FC = () => {
  const {
    attemptAuthentication,
    showPasswordDialog,
    closePasswordDialog,
    authLoading,
    authError
  } = useAuthWithFallback();

  const [authResult, setAuthResult] = useState<string>('');

  const handleAuthenticate = async () => {
    setAuthResult('');
    const result = await attemptAuthentication();
    
    if (result.success) {
      setAuthResult(`✅ Autentikointi onnistui! Token: ${result.token?.substring(0, 20)}...`);
    } else if (!result.needsPasswordFallback) {
      setAuthResult(`❌ Autentikointi epäonnistui: ${result.error}`);
    }
  };

  const handlePasswordSuccess = (token: string) => {
    setAuthResult(`✅ Salasana-autentikointi onnistui! Token: ${token.substring(0, 20)}...`);
  };

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔐 Autentikointi testaus (Location + Password Fallback)
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Tämä komponentti yrittää ensin sijainti-autentikointia. Jos se epäonnistuu 
            (esim. väärä sijainti), näytetään salasana-dialogi fallback-autentikointia varten.
          </Typography>

          <Box mb={2}>
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={handleAuthenticate}
              disabled={authLoading}
              size="large"
            >
              {authLoading ? 'Autentikoidaan...' : 'Testaa autentikointi'}
            </Button>
          </Box>

          {authError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {authError}
            </Alert>
          )}

          {authResult && (
            <Alert severity={authResult.startsWith('✅') ? 'success' : 'error'}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                {authResult}
              </Typography>
            </Alert>
          )}

          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              <strong>Fallback salasana:</strong> koti2025 (tai ympäristömuuttuja FALLBACK_PASSWORD)
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <PasswordAuthDialog
        open={showPasswordDialog}
        onClose={closePasswordDialog}
        onSuccess={handlePasswordSuccess}
        reason="Sijainti-autentikointi epäonnistui (et ole kotona)"
      />
    </Box>
  );
};

export default AuthTestComponent;