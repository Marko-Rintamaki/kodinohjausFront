/**
 * 📊 Trends - Historiadatan ja trendien sivu
 * 
 * Näyttää järjestelmän historian ja trendit:
 * - Lämpötilatrendit
 * - Nilan toimintahistoria
 * - Releen käyttöhistoria
 * - Socket.IO statusupdate toimii automaattisesti
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useSocketService } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';

interface TrendData {
  timestamps: string[];
  values: number[];
  label: string;
}

export const Trends: React.FC = () => {
  const { service, isConnected } = useSocketService();
  const { isAuthenticated } = useAuth();
  const [selectedTrend, setSelectedTrend] = useState('nilan_trend');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  // Saatavilla olevat trendit
  const availableTrends = [
    { id: 'nilan_trend', label: '🌡️ Nilan lämpötilat', description: 'Ilmanvaihdon lämpötilatrendit' },
    { id: 'temperature_trend', label: '🏠 Huonelämpötilat', description: 'Sisälämpötilatrendit' },
    { id: 'relay_usage', label: '🔌 Releiden käyttö', description: 'Laitteiden käyttöhistoria' }
  ];

  // Lataa trenddata
  const loadTrendData = useCallback(async (trendType: string) => {
    if (!isConnected) {
      setError('Ei yhteyttä palvelimeen');
      return;
    }

    try {
      setLoading(true);
      setError(undefined);
      
      console.log(`📊 Ladataan trend: ${trendType}`);
      
      const response = await service.sendRequest({
        type: 'trend_query',
        data: {
          queryType: trendType,
          params: {
            hours: 24, // Viimeiset 24 tuntia
            limit: 100 // Maksimissaan 100 datapistettä
          }
        }
      });

      if (response.success && response.data) {
        // Tarkista että data on oikeassa muodossa
        const data = Array.isArray(response.data) ? response.data : [response.data];
        setTrendData(data as TrendData[]);
        console.log(`📊 Trend ladattu: ${data.length} sarjaa`);
      } else {
        setError(response.error || 'Trendin lataus epäonnistui');
        setTrendData([]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verkkovirhe';
      console.error('❌ Virhe trendin latauksessa:', err);
      setError(errorMsg);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, service]);

  // Lataa data kun trendi vaihtuu
  useEffect(() => {
    if (selectedTrend) {
      loadTrendData(selectedTrend);
    }
  }, [selectedTrend, isConnected, loadTrendData]);

  // Kuuntele status-updatejä (päivitä trendit reaaliaikaisesti)
  useEffect(() => {
    if (!isConnected) return;

    const handleStatusUpdate = (data: Record<string, unknown>) => {
      console.log('📊 Trends: Status update vastaanotettu:', data);
      // Voisi päivittää trendin viimeisimmän arvon tässä
      // Toistaiseksi ei tehdä mitään, mutta yhteys toimii
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

  // Formatoi aikaleima
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fi-FI');
  };

  // Laske tilastoja
  const calculateStats = (values: number[]) => {
    if (values.length === 0) return { min: 0, max: 0, avg: 0 };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return { min, max, avg };
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
        <h1 className="text-3xl font-bold text-gray-900">Trendit</h1>
        <p className="text-gray-600 mt-1">
          Järjestelmän historiadat ja trendit
        </p>
      </div>

      {/* Trendin valinta */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Valitse trendi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {availableTrends.map((trend) => (
            <button
              key={trend.id}
              onClick={() => setSelectedTrend(trend.id)}
              className={`
                p-4 rounded-lg border text-left transition-colors
                ${selectedTrend === trend.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <h3 className="font-medium">{trend.label}</h3>
              <p className="text-sm text-gray-600 mt-1">{trend.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Latausstatus */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-600">Ladataan trendiä...</p>
        </div>
      )}

      {/* Virhe */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-900 font-medium mb-2">❌ Virhe</h3>
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => loadTrendData(selectedTrend)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Yritä uudelleen
          </button>
        </div>
      )}

      {/* Trenddata */}
      {!loading && !error && trendData.length > 0 && (
        <div className="space-y-6">
          {trendData.map((series, index) => {
            const stats = calculateStats(series.values);
            
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {series.label}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {series.values.length} datapistettä
                  </span>
                </div>

                {/* Tilastot */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <p className="text-sm text-gray-600">Minimi</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {stats.min.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <p className="text-sm text-gray-600">Keskiarvo</p>
                    <p className="text-lg font-semibold text-green-600">
                      {stats.avg.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <p className="text-sm text-gray-600">Maksimi</p>
                    <p className="text-lg font-semibold text-red-600">
                      {stats.max.toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Yksinkertainen datavisualisaatio */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Viimeisimmät arvot:</h4>
                  <div className="max-h-48 overflow-y-auto bg-gray-50 rounded p-3">
                    {series.timestamps.slice(-10).map((timestamp, i) => {
                      const valueIndex = series.timestamps.length - 10 + i;
                      const value = series.values[valueIndex];
                      
                      return (
                        <div key={i} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                          <span className="text-sm text-gray-600">
                            {formatTimestamp(timestamp)}
                          </span>
                          <span className="font-medium">
                            {value?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Päivitä-nappi */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => loadTrendData(selectedTrend)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    🔄 Päivitä data
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ei dataa */}
      {!loading && !error && trendData.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <h3 className="text-gray-900 font-medium mb-2">📊 Ei trendiä saatavilla</h3>
          <p className="text-gray-600 mb-4">
            Valitulla aikavälillä ei ole dataa tai trendi ei ole käytettävissä.
          </p>
          <button
            onClick={() => loadTrendData(selectedTrend)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Lataa uudelleen
          </button>
        </div>
      )}

      {/* Autentikointi-info */}
      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-yellow-900 font-medium mb-2">
            🔒 Huomio tunnistautumisesta
          </h3>
          <p className="text-yellow-800">
            Jotkut trendit saattavat vaatia tunnistautumisen. 
            Kirjaudu sisään nähdäksesi kaikki saatavilla olevat tiedot.
          </p>
        </div>
      )}
    </div>
  );
};