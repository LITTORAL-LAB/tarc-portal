import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import type { ChirpStackEvent } from "@/lib/api";
import { format } from "date-fns";

interface ChirpStackChartsProps {
  readonly events: ChirpStackEvent[];
}

// Formatação customizada do tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-card border border-border rounded-lg p-3 shadow-lg"
        style={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <p className="text-sm font-medium mb-2">{`Hora: ${label}`}</p>
        {payload.map((entry: any) => (
          <p
            key={entry.dataKey}
            className="text-sm"
            style={{ color: entry.color }}
          >{`${entry.name}: ${entry.value}${entry.unit ?? ""}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

export function ChirpStackCharts({ events }: ChirpStackChartsProps) {
  // Filtrar apenas eventos do tipo 'up' que têm dados RF
  const eventsWithRF = events.filter(
    (e) =>
      e.event_type === "up" &&
      (e.rssi !== null ||
        e.snr !== null ||
        e.frequency !== null ||
        e.dr !== null)
  );

  if (eventsWithRF.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <p className="text-muted-foreground">Nenhum dado RF disponível</p>
        </Card>
      </div>
    );
  }

  // Preparar dados para os gráficos
  const chartData = eventsWithRF.map((event) => {
    const eventTime = new Date(event.event_time);
    return {
      timestamp: eventTime.getTime(),
      timeLabel: format(eventTime, "dd/MM HH:mm"),
      rssi: event.rssi,
      snr: event.snr,
      frequency: event.frequency ? event.frequency / 1000000 : null, // Converter para MHz
      dr: event.dr,
      received_at: new Date(event.received_at).getTime(),
    };
  });

  // Ordenar por timestamp
  chartData.sort((a, b) => a.timestamp - b.timestamp);

  // Calcular domínios dinâmicos
  const rssiValues = chartData
    .map((d) => d.rssi)
    .filter((v) => v !== null && !Number.isNaN(v)) as number[];
  const rssiMin = rssiValues.length > 0 ? Math.min(...rssiValues) : -150;
  const rssiMax = rssiValues.length > 0 ? Math.max(...rssiValues) : 0;
  const rssiRange = rssiMax - rssiMin || 1;
  const rssiDomain = [rssiMin - rssiRange * 0.1, rssiMax + rssiRange * 0.1];

  const snrValues = chartData
    .map((d) => d.snr)
    .filter((v) => v !== null && !Number.isNaN(v)) as number[];
  const snrMin = snrValues.length > 0 ? Math.min(...snrValues) : -20;
  const snrMax = snrValues.length > 0 ? Math.max(...snrValues) : 20;
  const snrRange = snrMax - snrMin || 1;
  const snrDomain = [snrMin - snrRange * 0.1, snrMax + snrRange * 0.1];

  const frequencyValues = chartData
    .map((d) => d.frequency)
    .filter((v) => v !== null && !Number.isNaN(v)) as number[];
  const frequencyMin =
    frequencyValues.length > 0 ? Math.min(...frequencyValues) : 900;
  const frequencyMax =
    frequencyValues.length > 0 ? Math.max(...frequencyValues) : 930;
  const frequencyRange = frequencyMax - frequencyMin || 1;
  const frequencyDomain = [
    frequencyMin - frequencyRange * 0.05,
    frequencyMax + frequencyRange * 0.05,
  ];

  const drValues = chartData
    .map((d) => d.dr)
    .filter((v) => v !== null && !Number.isNaN(v)) as number[];
  const drMin = drValues.length > 0 ? Math.min(...drValues) : 0;
  const drMax = drValues.length > 0 ? Math.max(...drValues) : 15;
  const drDomain = [Math.max(0, drMin - 1), Math.min(15, drMax + 1)];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* RSSI Chart */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-sm font-medium text-foreground mb-4">
          RSSI ao Longo do Tempo
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timeLabel"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={rssiDomain}
              allowDataOverflow={false}
              label={{
                value: "RSSI (dBm)",
                angle: -90,
                position: "insideLeft",
                style: {
                  textAnchor: "middle",
                  fill: "hsl(var(--muted-foreground))",
                },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="rssi"
              stroke="hsl(220, 70%, 50%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="RSSI"
              unit=" dBm"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* SNR Chart */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-sm font-medium text-foreground mb-4">
          SNR ao Longo do Tempo
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timeLabel"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={snrDomain}
              allowDataOverflow={false}
              label={{
                value: "SNR (dB)",
                angle: -90,
                position: "insideLeft",
                style: {
                  textAnchor: "middle",
                  fill: "hsl(var(--muted-foreground))",
                },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="snr"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="SNR"
              unit=" dB"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Frequency Chart */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-sm font-medium text-foreground mb-4">
          Frequência ao Longo do Tempo
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timeLabel"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={frequencyDomain}
              allowDataOverflow={false}
              label={{
                value: "Frequência (MHz)",
                angle: -90,
                position: "insideLeft",
                style: {
                  textAnchor: "middle",
                  fill: "hsl(var(--muted-foreground))",
                },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="frequency"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="Frequência"
              unit=" MHz"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* DR Chart */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-sm font-medium text-foreground mb-4">
          Data Rate (DR) ao Longo do Tempo
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timeLabel"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={drDomain}
              allowDataOverflow={false}
              label={{
                value: "Data Rate",
                angle: -90,
                position: "insideLeft",
                style: {
                  textAnchor: "middle",
                  fill: "hsl(var(--muted-foreground))",
                },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="dr"
              stroke="hsl(262, 83%, 58%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="DR"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* RSSI vs SNR Scatter Chart */}
      <Card className="p-6 bg-card border-border lg:col-span-2">
        <h3 className="text-sm font-medium text-foreground mb-4">
          RSSI vs SNR (Correlação)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              dataKey="rssi"
              name="RSSI"
              unit=" dBm"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={rssiDomain}
              label={{
                value: "RSSI (dBm)",
                position: "insideBottom",
                offset: -5,
                style: { fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <YAxis
              type="number"
              dataKey="snr"
              name="SNR"
              unit=" dB"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={snrDomain}
              label={{
                value: "SNR (dB)",
                angle: -90,
                position: "insideLeft",
                style: {
                  textAnchor: "middle",
                  fill: "hsl(var(--muted-foreground))",
                },
              }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter
              dataKey="snr"
              fill="hsl(220, 70%, 50%)"
              fillOpacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
