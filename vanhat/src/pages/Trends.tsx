import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  ButtonGroup, 
  Alert, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Chip,
  CircularProgress,
  Badge
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ReactApexChart from 'react-apexcharts';
import { sendDataQuery, isSocketConnected, initializeAutoSocket } from '../helpers/socketHelper';

// Types
interface TrendPoint {
  ts: string;
  register: number;
  avg_scaled_value: number;
  unit?: string;
  description_fi?: string;
  description_en?: string;
}
interface TrendResult {
  success: boolean;
  queryType: string;
  results: TrendPoint[];
  metadata?: Record<string, unknown>;
  error?: string;
}

interface ChartSeries {
  name: string;
  data: Array<{ x: string; y: number }> | Array<number>; // Support both time series and single values
  color?: string;
}

interface ChartData {
  series: ChartSeries[];
  categories: string[];
}

type TimeRange = 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'custom';

const Trends: React.FC = () => {
  // State variables
  const [nilanData, setNilanData] = useState<TrendPoint[]>([]);
  const [electricTotalData, setElectricTotalData] = useState<TrendPoint[]>([]);
  const [electricBreakdownData, setElectricBreakdownData] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [electricityLoading, setElectricityLoading] = useState(false);
  
  const [selectedRange, setSelectedRange] = useState<TimeRange>('today');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const [maxRows, setMaxRows] = useState(200);

  // Chart colors from old system
  const chartColors = [
    '#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0',
    '#3F51B5', '#546E7A', '#D4526E', '#13D8AA', '#A5978B'
  ];

  // Initialize component - wait for socket connection properly
  useEffect(() => {
    const initializeWithSocketWait = async () => {
      console.log('🚀 Trends: Initializing socket and waiting for connection...');
      
      // First, ensure socket is initialized
      try {
        await initializeAutoSocket();
        console.log('🔌 Trends: Auto socket initialization completed');
      } catch (error) {
        console.log('⚠️ Trends: Auto socket initialization failed, continuing...', error);
      }
      
      // Wait for socket to be available and connected
      let attempts = 0;
      const maxAttempts = 20; // 20 seconds max wait
      
      while (attempts < maxAttempts) {
        const connected = isSocketConnected();
        console.log(`🔌 Trends: Socket check attempt ${attempts + 1}, connected: ${connected}`);
        
        if (connected) {
          console.log('✅ Trends: Socket is connected, loading data...');
          setTimeout(() => loadTrends(), 500); // Small delay to ensure socket is stable
          break;
        }
        
        // If not connected after a few attempts, try reinitializing socket
        if (attempts === 5) {
          console.log('🔄 Trends: Retrying socket initialization...');
          try {
            await initializeAutoSocket();
          } catch (error) {
            console.log('⚠️ Trends: Retry initialization failed', error);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.log('❌ Trends: Socket connection timeout, showing error...');
        setError('Socket-yhteys ei onnistu. Tarkista verkkoyhteys ja päivitä sivu.');
      }
    };
    
    initializeWithSocketWait();
  }, []);

  // Date formatting function
  const formatDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  };

  // Load trends data
  const loadTrends = useCallback(async () => {
    console.log('📊 Trends: Starting data load...');
    setLoading(true);
    setElectricityLoading(true);
    setError(null);
    
    // Check socket before trying to load
    if (!isSocketConnected()) {
      console.log('❌ Trends: Socket not connected, cannot load data');
      setError('Socket-yhteys ei ole valmis. Odota hetki tai päivitä sivu.');
      setLoading(false);
      setElectricityLoading(false);
      return;
    }
    
    try {
      const params = { 
        startDate: formatDate(startDate), 
        endDate: formatDate(endDate), 
        maxRows: maxRows 
      };
      
      console.log('📊 Trends: Sending data queries...', params);
      
      const [nilan, electrTotal, electrBreakdown] = await Promise.all([
        sendDataQuery({ queryType: 'nilan_trend', params }),
        sendDataQuery({ queryType: 'electricity_total_trend', params }),
        sendDataQuery({ queryType: 'electricity_breakdown_trend', params })
      ]) as [TrendResult, TrendResult, TrendResult];
      
      console.log('📊 Trends: Received responses:', { nilan: nilan.success, electrTotal: electrTotal.success, electrBreakdown: electrBreakdown.success });
      
      if (!nilan.success) throw new Error(nilan.error || 'Nilan trend error');
      if (!electrTotal.success) throw new Error(electrTotal.error || 'Electricity total trend error');
      if (!electrBreakdown.success) throw new Error(electrBreakdown.error || 'Electricity breakdown trend error');
      
      setNilanData(nilan.results || []);
      setElectricTotalData(electrTotal.results || []);
      setElectricBreakdownData(electrBreakdown.results || []);
      
      console.log('✅ Trends: Data loaded successfully');
      
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Trendien haku epäonnistui';
      console.log('❌ Trends: Error loading data:', errorMsg);
      if (errorMsg.includes('Socket not connected')) {
        setError('Socket-yhteys ei ole valmis. Yritetään uudelleen 3 sekunnin kuluttua...');
        // Retry after 3 seconds
        setTimeout(() => loadTrends(), 3000);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
      setElectricityLoading(false);
    }
  }, [startDate, endDate, maxRows]);

  // Placeholder functions - will implement these based on the old system
  const fetchAllTrendData = useCallback(() => {
    loadTrends();
  }, [loadTrends]);

  const handleTimeRangeSelect = useCallback((range: TimeRange) => {
    setSelectedRange(range);
    setShowCustomDatePicker(range === 'custom');
    
    const now = new Date();
    let start = new Date();
    
    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        setStartDate(start);
        setEndDate(now);
        setAutoRefresh(true);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(start);
        yesterdayEnd.setHours(23, 59, 59, 999);
        setStartDate(start);
        setEndDate(yesterdayEnd);
        setAutoRefresh(false);
        break;
      case 'lastWeek':
        start.setDate(now.getDate() - 7);
        setStartDate(start);
        setEndDate(now);
        setAutoRefresh(true);
        break;
      case 'lastMonth':
        start.setDate(now.getDate() - 30);
        setStartDate(start);
        setEndDate(now);
        setAutoRefresh(true);
        break;
      case 'custom':
        setAutoRefresh(false);
        break;
    }
  }, [loadTrends]);

  // Load data when time range or dates change
  useEffect(() => {
    if (selectedRange !== 'custom') {
      console.log('📅 Time range changed, loading new data...');
      loadTrends();
    }
  }, [selectedRange, startDate, endDate, loadTrends]);

  // Auto-refresh functionality - background updates without loading spinners
  useEffect(() => {
    if (!autoRefresh) return;

    console.log('🔄 Setting up auto-refresh interval...');
    const interval = setInterval(async () => {
      if (isSocketConnected() && !loading && !electricityLoading) {
        console.log('🔄 Auto-refreshing trends data...');
        
        // Update time range dynamically for real-time ranges
        const now = new Date();
        let newStartDate = startDate;
        let newEndDate = endDate;
        
        if (selectedRange === 'today') {
          newEndDate = now;
        } else if (selectedRange === 'lastWeek') {
          const start = new Date();
          start.setDate(now.getDate() - 7);
          newStartDate = start;
          newEndDate = now;
        } else if (selectedRange === 'lastMonth') {
          const start = new Date();
          start.setDate(now.getDate() - 30);
          newStartDate = start;
          newEndDate = now;
        }
        
        // Update dates if needed
        if (newStartDate !== startDate) setStartDate(newStartDate);
        if (newEndDate !== endDate) setEndDate(newEndDate);
        
        // Load data silently (no loading spinners)
        try {
          const params = { 
            startDate: formatDate(newStartDate), 
            endDate: formatDate(newEndDate), 
            maxRows: maxRows 
          };
          
          const [nilan, electrTotal, electrBreakdown] = await Promise.all([
            sendDataQuery({ queryType: 'nilan_trend', params }),
            sendDataQuery({ queryType: 'electricity_total_trend', params }),
            sendDataQuery({ queryType: 'electricity_breakdown_trend', params })
          ]) as [TrendResult, TrendResult, TrendResult];
          
          if (nilan.success) setNilanData(nilan.results || []);
          if (electrTotal.success) setElectricTotalData(electrTotal.results || []);
          if (electrBreakdown.success) setElectricBreakdownData(electrBreakdown.results || []);
          
          console.log('✅ Auto-refresh completed silently');
        } catch (error) {
          console.log('⚠️ Auto-refresh failed silently:', error);
        }
      }
    }, 30000); // Refresh every 30 seconds

    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [autoRefresh, loading, electricityLoading, selectedRange, startDate, endDate, maxRows, formatDate]);

  // Helper functions for chart data processing
  const groupByRegister = (data: TrendPoint[]) => {
    const map: Record<number, TrendPoint[]> = {};
    data.forEach(p => {
      if (!map[p.register]) map[p.register] = [];
      map[p.register].push(p);
    });
    return map;
  };

  const registerName = (p: TrendPoint) => p.description_fi || p.description_en || `Reg ${p.register}`;

  // Process chart data
  const nilanSeries = useMemo(() => {
    const grouped = groupByRegister(nilanData);
    return Object.entries(grouped).map(([, arr]) => ({
      name: registerName(arr[0]),
      data: arr.map(p => ({ x: p.ts, y: p.avg_scaled_value }))
    }));
  }, [nilanData]);

  // Power (W) series from total data only
  const electricPowerSeries = useMemo(() => {
    const powerPoints = electricTotalData.filter(p => (p.unit || '').toLowerCase() === 'w');
    const grouped = groupByRegister(powerPoints);
    return Object.entries(grouped).map(([, arr]) => ({
      name: registerName(arr[0]),
      data: arr.map(p => ({ x: p.ts, y: p.avg_scaled_value }))
    }));
  }, [electricTotalData]);

  // Energy consumption bars - one bar per register showing total delta
  const cumulativeElectricSeries = useMemo(() => {
    // Use only total data for TOT+/TOT- registers (not breakdown)
    const kwhPoints = electricTotalData.filter(p => (p.unit || '').toLowerCase() === 'kwh');
    if (!kwhPoints.length) return [] as any[];
    const grouped: Record<number, TrendPoint[]> = {};
    kwhPoints.forEach(p => {
      if (!grouped[p.register]) grouped[p.register] = [];
      grouped[p.register].push(p);
    });
    
    return Object.entries(grouped).map(([, arr], index) => {
      if (!arr.length) return { name: '', data: [] };
      
      // Sort chronologically and calculate total consumption for the period
      const sorted = arr.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      
      if (sorted.length >= 2) {
        const firstReading = sorted[0].avg_scaled_value;
        const lastReading = sorted[sorted.length - 1].avg_scaled_value;
        const totalConsumption = Number((lastReading - firstReading).toFixed(2));
        
        return {
          name: registerName(arr[0]), // TOT+ or TOT-
          data: [totalConsumption], // Single value per register
          color: chartColors[index] // Assign color directly to each series
        };
      }
      
      return { name: registerName(arr[0]), data: [0], color: chartColors[index] };
    });
  }, [electricTotalData, chartColors]); // Only use total data, not breakdown

  // Breakdown power (W) series - real-time power consumption per phase
  const breakdownPowerSeries = useMemo(() => {
    const powerPoints = electricBreakdownData.filter(p => (p.unit || '').toLowerCase() === 'w');
    const grouped = groupByRegister(powerPoints);
    return Object.entries(grouped).map(([, arr]) => ({
      name: registerName(arr[0]),
      data: arr.map(p => ({ x: p.ts, y: p.avg_scaled_value }))
    }));
  }, [electricBreakdownData]);

  // Breakdown energy series - showing individual register consumption (kWh)
  const breakdownElectricSeries = useMemo(() => {
    const kwhPoints = electricBreakdownData.filter(p => (p.unit || '').toLowerCase() === 'kwh');
    if (!kwhPoints.length) return [] as any[];
    const grouped: Record<number, TrendPoint[]> = {};
    kwhPoints.forEach(p => {
      if (!grouped[p.register]) grouped[p.register] = [];
      grouped[p.register].push(p);
    });
    
    return Object.entries(grouped).map(([, arr], index) => {
      if (!arr.length) return { name: '', data: [] };
      
      // Sort chronologically and calculate total consumption for the period
      const sorted = arr.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      
      if (sorted.length >= 2) {
        const firstReading = sorted[0].avg_scaled_value;
        const lastReading = sorted[sorted.length - 1].avg_scaled_value;
        const totalConsumption = Number((lastReading - firstReading).toFixed(2));
        
        return {
          name: registerName(arr[0]), // Individual register names
          data: [totalConsumption], // Single value per register
          color: chartColors[index + 2] // Use different colors than total chart
        };
      }
      
      return { name: registerName(arr[0]), data: [0], color: chartColors[index + 2] };
    });
  }, [electricBreakdownData, chartColors]);

  // Chart data 
  const nilanChartData: ChartData = {
    series: nilanSeries,
    categories: []
  };

  const powerChartData: ChartData = {
    series: electricPowerSeries,
    categories: []
  };

  const energyChartData: ChartData = {
    series: cumulativeElectricSeries,
    categories: [`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`] // Single category for the period
  };

  const breakdownEnergyChartData: ChartData = {
    series: breakdownElectricSeries,
    categories: [`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`] // Single category for the period
  };

  const breakdownPowerChartData: ChartData = {
    series: breakdownPowerSeries,
    categories: []
  };  const nilanChartOptions = {
    chart: {
      type: 'line' as const,
      height: 600,
      zoom: { enabled: true }
    },
    stroke: { width: 2 },
    title: { text: 'Nilan Heat Pump Data' }
  };

  const powerChartOptions = {
    chart: {
      type: 'line' as const,
      height: 600,
      zoom: { enabled: true }
    },
    stroke: { width: 2 },
    title: { text: 'Power Consumption' }
  };

  const energyChartOptions = {
    chart: {
      type: 'bar' as const,
      height: 600,
      animations: { enabled: false }
    },
    colors: [chartColors[0], chartColors[1]], // First color blue, second green
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '70%', // Make bars wider
        distributed: false, // Use series-based coloring instead
        groupPadding: 0.2 // Add padding between groups
      }
    },
    stroke: { width: 1 },
    xaxis: { 
      type: 'category' as const,
      categories: energyChartData.categories
    },
    yaxis: { 
      labels: { 
        formatter: (v: number) => `${v.toFixed(2)} kWh`
      }
    },
    legend: { 
      position: 'top' as const,
      show: true
    },
    title: { 
      text: 'TOT+/TOT- ΔkWh (Kulutus/Tuotto koko ajanjaksolla)',
      style: { fontSize: '16px' }
    },
    tooltip: { 
      shared: false, 
      intersect: true,
      y: {
        formatter: (val: number) => `${val.toFixed(2)} kWh`
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)} kWh`
    }
  };

  const breakdownEnergyChartOptions = {
    chart: {
      type: 'bar' as const,
      height: 600,
      animations: { enabled: false }
    },
    colors: chartColors.slice(2), // Use colors starting from index 2
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '100%', // Make bars wider
        distributed: false, // Use series-based coloring instead
        groupPadding: 0.2 // Add padding between groups
      }
    },
    stroke: { width: 1 },
    xaxis: { 
      type: 'category' as const,
      categories: breakdownEnergyChartData.categories
    },
    yaxis: { 
      labels: { 
        formatter: (v: number) => `${v.toFixed(2)} kWh`
      }
    },
    legend: { 
      position: 'top' as const,
      show: true
    },
    title: { 
      text: 'Breakdown ΔkWh (Yksittäiset mittarit koko ajanjaksolla)',
      style: { fontSize: '16px' }
    },
    tooltip: { 
      shared: false, 
      intersect: true,
      y: {
        formatter: (val: number) => `${val.toFixed(2)} kWh`
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)} kWh`
    }
  };

  const breakdownPowerChartOptions = {
    chart: {
      type: 'line' as const,
      height: 600,
      zoom: { enabled: true }
    },
    stroke: { width: 2 },
    title: { text: 'Breakdown Power Consumption (Vaihekohtainen teho)' }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" gutterBottom>
            Energy Data Viewer
          </Typography>
        </Box>
        
        {/* Time Range Selection */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Time Range Selection</Typography>
              {['today', 'lastWeek', 'lastMonth'].includes(selectedRange) && autoRefresh && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Badge color="success" variant="dot">
                    <Chip label="Auto-refreshing" color="success" size="small" />
                  </Badge>
                  <Typography variant="caption" color="text.secondary">
                    Updates every minute
                  </Typography>
                </Box>
              )}
            </Box>
            
            <ButtonGroup fullWidth sx={{ mb: 2 }}>
              <Button 
                variant={selectedRange === 'today' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeSelect('today')}
              >
                Today
              </Button>
              <Button 
                variant={selectedRange === 'yesterday' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeSelect('yesterday')}
              >
                Yesterday
              </Button>
              <Button 
                variant={selectedRange === 'lastWeek' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeSelect('lastWeek')}
              >
                Last 7 Days
              </Button>
              <Button 
                variant={selectedRange === 'lastMonth' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeSelect('lastMonth')}
              >
                Last 30 Days
              </Button>
              <Button 
                variant={selectedRange === 'custom' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeSelect('custom')}
              >
                Custom
              </Button>
            </ButtonGroup>

            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Selected Range:</strong> {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {endDate.toLocaleDateString()} {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              {['today', 'lastWeek', 'lastMonth'].includes(selectedRange) && (
                <span style={{ marginLeft: 8, color: 'green' }}>(Live - updates automatically)</span>
              )}
            </Alert>
            
            {showCustomDatePicker && (
              <Box display="flex" gap={2} flexDirection={{ xs: 'column', md: 'row' }}>
                <Box flex="1">
                  <DateTimePicker
                    label="Start Date & Time"
                    value={startDate}
                    onChange={(newValue) => newValue && setStartDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Box>
                <Box flex="1">
                  <DateTimePicker
                    label="End Date & Time"
                    value={endDate}
                    onChange={(newValue) => newValue && setEndDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Box>
                <Box flex="0 0 200px">
                  <FormControl fullWidth>
                    <InputLabel>Resolution</InputLabel>
                    <Select
                      value={maxRows}
                      label="Resolution"
                      onChange={(e) => setMaxRows(Number(e.target.value))}
                    >
                      <MenuItem value={100}>100 points</MenuItem>
                      <MenuItem value={200}>200 points</MenuItem>
                      <MenuItem value={500}>500 points</MenuItem>
                      <MenuItem value={1000}>1000 points</MenuItem>
                      <MenuItem value={0}>All data</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box flex="0 0 150px">
                  <Button 
                    variant="contained"
                    fullWidth
                    onClick={fetchAllTrendData}
                    disabled={loading || electricityLoading}
                    sx={{ height: '56px' }}
                  >
                    {loading || electricityLoading ? <CircularProgress size={24} /> : 'Fetch Data'}
                  </Button>
                </Box>
              </Box>
            )}
            
            {selectedRange === 'yesterday' && (
              <Box display="flex" justifyContent="center">
                <Button 
                  variant="contained"
                  color="success"
                  onClick={fetchAllTrendData}
                  disabled={loading || electricityLoading}
                >
                  {loading || electricityLoading ? <CircularProgress size={24} /> : 'Refresh Data'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
        
        {/* Nilan Heat Pump Chart */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Nilan Heat Pump Data
        </Typography>
        {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        {nilanData.length > 0 ? (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <ReactApexChart
                options={nilanChartOptions}
                series={nilanChartData.series || []}
                type="line"
                height={600}
              />
            </CardContent>
          </Card>
        ) : (
          <Typography>No Nilan trend data available. Select a time range above to view data.</Typography>
        )}
        
        {/* Electricity Charts */}
        <Typography variant="h5" gutterBottom sx={{ mt: 5 }}>
          Electricity Consumption Data
        </Typography>
        {electricityLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        {electricTotalData.length > 0 || electricBreakdownData.length > 0 ? (
          <Box 
            display="flex" 
            gap={2} 
            flexDirection={{ xs: 'column', lg: 'row' }}
            sx={{ mb: 3 }}
          >
            <Box flex={{ xs: 1, lg: 3 }}>
              <Card>
                <CardContent>
                  <ReactApexChart
                    options={powerChartOptions}
                    series={powerChartData.series || []}
                    type="line"
                    height={600}
                  />
                </CardContent>
              </Card>
            </Box>
            
            <Box flex={{ xs: 1, lg: 1 }} minWidth={{ xs: 'auto', lg: '365px' }}>
              <Card>
                <CardContent>
                  <ReactApexChart
                    options={energyChartOptions}
                    series={energyChartData.series || []}
                    type="bar"
                    height={600}
                  />
                </CardContent>
              </Card>
            </Box>
          </Box>
        ) : (
          <Typography>No electricity data available. Data will load automatically for today's selection.</Typography>
        )}

        {/* Breakdown Electricity Charts */}
        {electricBreakdownData.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Breakdown Electricity Data (Vaihekohtainen mittaus)
            </Typography>
            <Box 
              display="flex" 
              gap={2} 
              flexDirection={{ xs: 'column', lg: 'row' }}
              sx={{ mb: 3 }}
            >
              <Box flex={{ xs: 1, lg: 3 }}>
                <Card>
                  <CardContent>
                    <ReactApexChart
                      options={breakdownPowerChartOptions}
                      series={breakdownPowerChartData.series || []}
                      type="line"
                      height={600}
                    />
                  </CardContent>
                </Card>
              </Box>
              
              <Box flex={{ xs: 1, lg: 1 }} minWidth={{ xs: 'auto', lg: '365px' }}>
                <Card>
                  <CardContent>
                    <ReactApexChart
                      options={breakdownEnergyChartOptions}
                      series={breakdownEnergyChartData.series || []}
                      type="bar"
                      height={600}
                    />
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </>
        )}
        
        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            <Typography variant="h6">Error:</Typography>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Trends;
