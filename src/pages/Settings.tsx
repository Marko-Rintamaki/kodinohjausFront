/**
 * ⚙️ Settings - Asetukset ja konfiguraatio
 * 
 * Järjestelmän asetusten hallinta:
 * - Käyttäjäasetukset
 * - Järjestelmän konfiguraatio
 * - Socket.IO yhteyden hallinta
 * - Autentikointiasetukset
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useSocketService } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';

interface SystemInfo {
  version?: string;
  uptime?: number;
  lastRestart?: string;
  activeConnections?: number;
}

export const Settings: React.FC = () => {
  const { service, isConnected, connectionStatus } = useSocketService();
  const { isAuthenticated, token, logout } = useAuth();
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({});
  const [loading, setLoading] = useState(false);

  // Socket.IO asetukset
  const [socketUrl, setSocketUrl] = useState('https://kodinohjaus.fi');
  const [autoReconnect, setAutoReconnect] = useState(true);

  // Lataa järjestelmätiedot
  const loadSystemInfo = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      setLoading(true);
      
      const response = await service.sendRequest({
        type: 'get_global_data'
      });

      if (response.success && response.data) {
        setSystemInfo(response.data as SystemInfo);
      }
    } catch (error) {
      console.error('❌ Virhe järjestelmätietojen latauksessa:', error);
    } finally {
      setLoading(false);
    }
  }, [isConnected, service]);

  useEffect(() => {
    loadSystemInfo();
  }, [isConnected, loadSystemInfo]);

  // Kuuntele status-updatejä
  useEffect(() => {
    if (!isConnected) return;

    const handleStatusUpdate = (data: Record<string, unknown>) => {
      console.log('⚙️ Settings: Status update vastaanotettu:', data);
      // Päivitä järjestelmätiedot jos tarvetta
      if (data.systemInfo) {
        setSystemInfo(prev => ({ ...prev, ...data.systemInfo as SystemInfo }));
      }
    };

    try {
      const socket = service.instance;
      socket.on('statusUpdate', handleStatusUpdate);

      return () => {
        socket.off('statusUpdate', handleStatusUpdate);
      };
    } catch (error) {
      console.warn('⚠️ Socket ei ole vielä yhdistetty:', error);
      return () => {};
    }
  }, [isConnected, service]);

  // Testaa yhteys
  const testConnection = async () => {
    try {
      setLoading(true);
      
      const response = await service.sendRequest({
        type: 'get_controller_status'
      });

      if (response.success) {
        alert('✅ Yhteys toimii! Palvelin vastaa normaalisti.');
      } else {
        alert(`❌ Yhteysvirhe: ${response.error || 'Tuntematon virhe'}`);
      }
    } catch (error) {
      alert(`❌ Verkkovirhe: ${error instanceof Error ? error.message : 'Tuntematon virhe'}`);
    } finally {
      setLoading(false);
    }
  };

  // Tyhjennä localStorage
  const clearStorage = () => {
    if (confirm('Haluatko varmasti tyhjentää kaikki tallennetut asetukset?')) {
      localStorage.clear();
      alert('✅ Tallennetut asetukset tyhjennetty. Päivitä sivu.');
    }
  };

  // Formatoi uptime
  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Yhdistetään palvelimeen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Otsikko */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Asetukset</h1>
        <p className="text-gray-600 mt-1">
          Järjestelmän asetukset ja konfiguraatio
        </p>
      </div>

      {/* Yhteyden tila */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔌 Yhteyden tila</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Socket.IO</h3>
            <p className={`text-sm mt-1 ${
              isConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              {isConnected ? '✅ Yhdistetty' : '❌ Ei yhteyttä'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Tila: {connectionStatus}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Autentikointi</h3>
            <p className={`text-sm mt-1 ${
              isAuthenticated ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {isAuthenticated ? '✅ Kirjautunut' : '⚠️ Ei kirjautunut'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Token: {token ? 'Saatavilla' : 'Ei tokenia'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Palvelin</h3>
            <p className="text-sm mt-1 text-blue-600">
              {socketUrl}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Uptime: {formatUptime(systemInfo.uptime)}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Versio</h3>
            <p className="text-sm mt-1 text-gray-900">
              {systemInfo.version || 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Yhteyksiä: {systemInfo.activeConnections || 0}
            </p>
          </div>
        </div>

        {/* Toiminnot */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={testConnection}
            disabled={loading || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '⏳ Testaa...' : '🔄 Testaa yhteys'}
          </button>
          
          <button
            onClick={loadSystemInfo}
            disabled={loading || !isConnected}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            📊 Päivitä tiedot
          </button>
        </div>
      </div>

      {/* Autentikointiasetukset */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔒 Autentikointi</h2>
        
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-900 font-medium mb-2">✅ Kirjautunut sisään</h3>
              <p className="text-green-800 text-sm">
                Olet tällä hetkellä kirjautunut sisään järjestelmään.
              </p>
              {token && (
                <p className="text-green-700 text-xs mt-2 font-mono break-all">
                  Token: {token.substring(0, 20)}...
                </p>
              )}
            </div>
            
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              🚪 Kirjaudu ulos
            </button>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-900 font-medium mb-2">⚠️ Ei kirjautunut</h3>
            <p className="text-yellow-800 text-sm mb-3">
              Kirjaudu sisään käyttääksesi kaikkia järjestelmän toimintoja.
            </p>
            <p className="text-yellow-700 text-xs">
              Käytä yläpalkin autentikointinapppeja kirjautuaksesi sisään.
            </p>
          </div>
        )}
      </div>

      {/* Järjestelmätiedot */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Järjestelmätiedot</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Palvelimen versio</span>
            <span className="font-medium">{systemInfo.version || 'Tuntematon'}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Käyttöaika</span>
            <span className="font-medium">{formatUptime(systemInfo.uptime)}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Viimeisin käynnistys</span>
            <span className="font-medium">
              {systemInfo.lastRestart ? new Date(systemInfo.lastRestart).toLocaleString('fi-FI') : 'N/A'}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Aktiiviset yhteydet</span>
            <span className="font-medium">{systemInfo.activeConnections || 0}</span>
          </div>
        </div>
      </div>

      {/* Kehittäjäasetukset */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Kehittäjäasetukset</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Socket.IO URL
            </label>
            <input
              type="text"
              value={socketUrl}
              onChange={(e) => setSocketUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://kodinohjaus.fi"
            />
            <p className="text-xs text-gray-500 mt-1">
              Vaatii sivun päivityksen muutoksen jälkeen
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoReconnect"
              checked={autoReconnect}
              onChange={(e) => setAutoReconnect(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoReconnect" className="text-sm text-gray-700">
              Automaattinen uudelleenyhdistäminen
            </label>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={clearStorage}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              🗑️ Tyhjennä localStorage
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Poistaa kaikki tallennetut asetukset ja tokenin
            </p>
          </div>
        </div>
      </div>

      {/* Debug-info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">🐛 Debug-tiedot</h3>
        <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-auto">
{JSON.stringify({
  isConnected,
  connectionStatus,
  isAuthenticated,
  hasToken: !!token,
  socketUrl,
  autoReconnect,
  systemInfo
}, null, 2)}
        </pre>
      </div>
    </div>
  );
};