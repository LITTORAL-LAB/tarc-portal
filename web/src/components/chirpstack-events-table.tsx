import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChirpStackEvent } from "@/lib/api";
import { format } from "date-fns";

interface ChirpStackEventsTableProps {
  events: ChirpStackEvent[];
  onViewDetails?: (event: ChirpStackEvent) => void;
}

export function ChirpStackEventsTable({
  events,
  onViewDetails,
}: ChirpStackEventsTableProps) {
  const getEventTypeBadgeVariant = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "up":
        return "default";
      case "join":
        return "default";
      case "log":
        return "secondary";
      case "ack":
        return "outline";
      default:
        return "outline";
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "up":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "join":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "log":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "ack":
        return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss");
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="bg-card border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Device EUI</TableHead>
            <TableHead>Nome do Dispositivo</TableHead>
            <TableHead>Data/Hora</TableHead>
            <TableHead>F Port</TableHead>
            <TableHead>RSSI</TableHead>
            <TableHead>SNR</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center text-muted-foreground py-8"
              >
                Nenhum evento encontrado
              </TableCell>
            </TableRow>
          ) : (
            events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-mono text-xs">{event.id}</TableCell>
                <TableCell>
                  <Badge
                    variant={getEventTypeBadgeVariant(event.event_type)}
                    className={getEventTypeColor(event.event_type)}
                  >
                    {event.event_type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {event.dev_eui}
                </TableCell>
                <TableCell>
                  {event.device_name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(event.event_time)}
                </TableCell>
                <TableCell>
                  {event.f_port !== null ? (
                    event.f_port
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {event.rssi !== null ? (
                    `${event.rssi} dBm`
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {event.snr !== null ? (
                    `${event.snr} dB`
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(event)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Detalhes
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
