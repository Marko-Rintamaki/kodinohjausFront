import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { requestPasswordAuthentication } from '../helpers/socketHelper';

interface PasswordAuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  reason?: string;
}

const PasswordAuthDialog: React.FC<PasswordAuthDialogProps> = ({
  open,
  onClose,
  onSuccess,
  reason = 'Sijainti-autentikointi epäonnistui'
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError('Syötä salasana');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await requestPasswordAuthentication(password);
      
      if (result.success && result.token) {
        // Tallenna token localStorage:iin
        localStorage.setItem('authToken', result.token);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90); // 90 päivää
        localStorage.setItem('tokenExpiry', expiryDate.getTime().toString());
        
        console.log('Password authentication successful!');
        onSuccess(result.token);
        onClose();
        setPassword('');
      } else {
        setError(result.error || 'Väärä salasana');
      }
    } catch (err) {
      console.error('Password authentication error:', err);
      setError('Autentikointi epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LockIcon color="primary" />
          <Typography variant="h6">
            Vaihtoehtoinen autentikointi
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {reason}. Syötä vaihtoehtoinen salasana jatkaaksesi.
          </Typography>
        </Alert>
        
        <TextField
          autoFocus
          fullWidth
          type="password"
          label="Salasana"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          variant="outlined"
          sx={{ mt: 1 }}
          helperText="Syötä järjestelmän fallback-salasana"
        />
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleClose}
          disabled={loading}
        >
          Peruuta
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !password.trim()}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? 'Kirjaudutaan...' : 'Kirjaudu'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordAuthDialog;