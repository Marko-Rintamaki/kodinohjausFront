import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { sendDataQuery } from '../helpers/socketHelper';
import { Box, Card, CardContent, Typography, Button, Stack, ToggleButtonGroup, ToggleButton, LinearProgress, Alert } from '@mui/material';

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

const formatDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

const initialRange = () => {
  const end = new Date();
  const start = new Date();
  start.setHours(start.getHours() - 6); // 6h oletus
  return { start, end };
};

const registerName = (p: TrendPoint) => p.description_fi || p.description_en || `Reg ${p.register}`;

export const TrendsSection: React.FC = () => {
  const [{ start, end }, setRange] = useState(initialRange());
  const [nilanData, setNilanData] = useState<TrendPoint[]>([]);
  const [electricTotalData, setElectricTotalData] = useState<TrendPoint[]>([]);
  const [electricBreakdownData, setElectricBreakdownData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState(400);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { startDate: formatDate(start), endDate: formatDate(end), maxRows: resolution };
      const [nilan, electrTotal, electrBreakdown] = await Promise.all([
        sendDataQuery({ queryType: 'nilan_trend', params }),
        sendDataQuery({ queryType: 'electricity_total_trend', params }),
        sendDataQuery({ queryType: 'electricity_breakdown_trend', params })
      ]) as [TrendResult, TrendResult, TrendResult];
      if (!nilan.success) throw new Error(nilan.error || 'Nilan trend error');
      if (!electrTotal.success) throw new Error(electrTotal.error || 'Electricity total trend error');
      if (!electrBreakdown.success) throw new Error(electrBreakdown.error || 'Electricity breakdown trend error');
      setNilanData(nilan.results || []);
      setElectricTotalData(electrTotal.results || []);
      setElectricBreakdownData(electrBreakdown.results || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Trendien haku epäonnistui');
    } finally {
      setLoading(false);
    }
  }, [start, end, resolution]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      setRange(r => ({ start: r.start, end: new Date() }));
      loadTrends();
    }, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, loadTrends]);

  const groupByRegister = (data: TrendPoint[]) => {
    const map: Record<number, TrendPoint[]> = {};
    data.forEach(p => {
      if (!map[p.register]) map[p.register] = [];
      map[p.register].push(p);
    });
    return map;
  };

  const nilanSeries = useMemo(() => {
    const grouped = groupByRegister(nilanData);
    return Object.entries(grouped).map(([, arr]) => ({
      name: registerName(arr[0]),
      data: arr.map(p => ({ x: p.ts, y: p.avg_scaled_value }))
    }));
  }, [nilanData]);

  // Power (W) series from total data only (exclude kWh + calculated register 999 if unit not W)
  const electricPowerSeries = useMemo(() => {
    const powerPoints = electricTotalData.filter(p => (p.unit || '').toLowerCase() === 'w');
    const grouped = groupByRegister(powerPoints);
    return Object.entries(grouped).map(([, arr]) => ({
      name: registerName(arr[0]),
      data: arr.map(p => ({ x: p.ts, y: p.avg_scaled_value }))
    }));
  }, [electricTotalData]);

  // Cumulative kWh series: normalize each kWh register to start at zero inside selected range
  const cumulativeElectricSeries = useMemo(() => {
    // Merge kWh-capable points from total + breakdown (so we can show total + per-phase)
    const kwhPoints = [...electricTotalData, ...electricBreakdownData].filter(p => (p.unit || '').toLowerCase() === 'kwh');
    if (!kwhPoints.length) return [] as any[];
    const grouped: Record<number, TrendPoint[]> = {};
    kwhPoints.forEach(p => {
      if (!grouped[p.register]) grouped[p.register] = [];
      grouped[p.register].push(p);
    });
    return Object.entries(grouped).map(([, arr]) => {
      // Ensure chronological order by timestamp string (format '%d.%m.%y %H:%i') -> convert to Date for safety
      const parseTs = (ts: string) => {
        // format dd.mm.yy HH:MM
        const [datePart, timePart] = ts.split(' ');
        const [d, m, y] = datePart.split('.').map(Number);
        const [H, M] = timePart.split(':').map(Number);
        return new Date(2000 + y, m - 1, d, H, M);
      };
      const sorted = [...arr].sort((a,b)=> parseTs(a.ts).getTime() - parseTs(b.ts).getTime());
      const base = sorted[0].avg_scaled_value;
      return {
        name: registerName(sorted[0]) + ' (Δ)',
        data: sorted.map(p => ({ x: p.ts, y: Number((p.avg_scaled_value - base).toFixed(2)) }))
      };
    });
  }, [electricTotalData, electricBreakdownData]);

  // Total kWh registers (e.g. TOT+ / TOT-) as bars (cumulative Δ from period start)
  const totalKwhBarSeries = useMemo(() => {
    const kwhPoints = electricTotalData.filter(p => (p.unit || '').toLowerCase() === 'kwh');
    if (!kwhPoints.length) return [] as any[];
    const grouped = groupByRegister(kwhPoints);
    return Object.entries(grouped).map(([, arr]) => {
      const sorted = [...arr]; // SQL already orders by ts, safe to keep
      const base = sorted[0].avg_scaled_value;
      return {
        name: registerName(sorted[0]),
        data: sorted.map(p => ({ x: p.ts, y: Number((p.avg_scaled_value - base).toFixed(2)) }))
      };
    });
  }, [electricTotalData]);

  // Phase power (W) bars for L1/L2/L3 from breakdown table (registers 18,20,22)
  const phasePowerBarSeries = useMemo(() => {
    const phasePoints = electricBreakdownData.filter(p => [18,20,22].includes(p.register));
    if (!phasePoints.length) return [] as any[];
    const grouped = groupByRegister(phasePoints);
    return Object.entries(grouped).map(([, arr]) => ({
      name: registerName(arr[0]),
      data: arr.map(p => ({ x: p.ts, y: p.avg_scaled_value }))
    }));
  }, [electricBreakdownData]);

  const electricBreakdownSeries = useMemo(() => {
    const grouped = groupByRegister(electricBreakdownData);
    return Object.entries(grouped).map(([, arr]) => ({
      name: registerName(arr[0]),
      data: arr.map(p => ({ x: p.ts, y: p.avg_scaled_value }))
    }));
  }, [electricBreakdownData]);

  const baseChartOptions = (title: string) => ({
    chart: { type: 'line', height: 350, animations: { enabled: false } },
    stroke: { width: 2 },
    xaxis: { type: 'category', tickAmount: 8 },
    yaxis: { labels: { formatter: (v: number) => v.toString() } },
    legend: { position: 'top' },
    title: { text: title, style: { fontSize: '16px' } },
    tooltip: { shared: true, intersect: false }
  });

  const setQuickRange = (hours: number) => {
    const end = new Date();
    const start = new Date();
    start.setHours(start.getHours() - hours);
    setRange({ start, end });
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2} alignItems="center" mb={2}>
          <Typography variant="h5">Trendit</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup size="small" exclusive value={0}>
              <ToggleButton value={1} onClick={() => setQuickRange(6)}>6h</ToggleButton>
              <ToggleButton value={2} onClick={() => setQuickRange(12)}>12h</ToggleButton>
              <ToggleButton value={3} onClick={() => setQuickRange(24)}>24h</ToggleButton>
              <ToggleButton value={4} onClick={() => setQuickRange(72)}>3d</ToggleButton>
            </ToggleButtonGroup>
            <Button size="small" variant={autoRefresh ? 'contained' : 'outlined'} onClick={() => setAutoRefresh(a=>!a)}>{autoRefresh ? 'Auto ON' : 'Auto OFF'}</Button>
            <Button size="small" variant="outlined" onClick={loadTrends} disabled={loading}>Päivitä</Button>
          </Stack>
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap" mb={2}>
          <Box>
            <Typography variant="caption">Alku</Typography>
            <Typography variant="body2">{formatDate(start)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption">Loppu</Typography>
            <Typography variant="body2">{formatDate(end)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption">Reso</Typography>
            <select value={resolution} onChange={e=>setResolution(parseInt(e.target.value))} style={{ padding:4 }}>
              <option value={200}>200</option>
              <option value={400}>400</option>
              <option value={800}>800</option>
              <option value={1200}>1200</option>
            </select>
          </Box>
        </Stack>
        {loading && <LinearProgress sx={{ mb:2 }} />}
        {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
        <Box sx={{ width:'100%', overflow:'auto' }}>
          <Typography variant="subtitle1" sx={{ mt:2, mb:1 }}>Nilan</Typography>
          <ReactApexChart options={baseChartOptions('Nilan')} series={nilanSeries} type="line" height={350} />
          {/* Electricity charts: power (instantaneous W) vs cumulative kWh side-by-side */}
          <Box sx={{ display:'flex', flexWrap:'wrap', gap:2, mt:4 }}>
            <Box sx={{ flex:1, minWidth:380 }}>
              <Typography variant="subtitle1" sx={{ mb:1 }}>Sähkö (teho W)</Typography>
              <ReactApexChart options={baseChartOptions('Sähkö teho (W)')} series={electricPowerSeries} type="line" height={350} />
            </Box>
            <Box sx={{ flex:1, minWidth:380 }}>
              <Typography variant="subtitle1" sx={{ mb:1 }}>Sähkö (kumulatiivinen kWh)</Typography>
              <ReactApexChart options={baseChartOptions('Sähkö kumulatiivinen (ΔkWh)')} series={cumulativeElectricSeries} type="line" height={350} />
            </Box>
          </Box>
          {/* Old layout style bar charts */}
          <Box sx={{ display:'flex', flexWrap:'wrap', gap:2, mt:4 }}>
            <Box sx={{ flex:1, minWidth:380 }}>
              <Typography variant="subtitle1" sx={{ mb:1 }}>Kokonaiskulutus / Verkkoon (pylväs)</Typography>
              <ReactApexChart options={{
                ...baseChartOptions('TOT+/TOT- ΔkWh'),
                chart:{ type:'bar', height:350, animations:{enabled:false}},
                tooltip: { shared: false, intersect: true },
                plotOptions:{ bar:{ horizontal:false } }
              }} series={totalKwhBarSeries} type="bar" height={350} />
            </Box>
            <Box sx={{ flex:1, minWidth:380 }}>
              <Typography variant="subtitle1" sx={{ mb:1 }}>L1 L2 L3 (pylväs)</Typography>
              <ReactApexChart options={{
                ...baseChartOptions('Vaihetehot (W)'),
                chart:{ type:'bar', height:350, animations:{enabled:false}},
                tooltip: { shared: false, intersect: true },
                plotOptions:{ bar:{ horizontal:false } }
              }} series={phasePowerBarSeries} type="bar" height={350} />
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ mt:4, mb:1 }}>Sähkö (erittely)</Typography>
          <ReactApexChart options={baseChartOptions('Sähkö erittely')} series={electricBreakdownSeries} type="line" height={350} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default TrendsSection;
