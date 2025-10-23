import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, CheckCircle, XCircle, Shield, Eye, LogOut, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuthLog {
  id: string;
  user_id: string | null;
  email: string;
  evento: string;
  metodo: string | null;
  ip_address: unknown;
  exitoso: boolean;
  mensaje_error: string | null;
  timestamp: string;
  datos_adicionales: any;
  user_agent: string | null;
  created_at: string;
}

export default function AdminAuthLogs() {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [filterEvento, setFilterEvento] = useState<string>("todos");
  const [filterExitoso, setFilterExitoso] = useState<string>("todos");
  const { toast } = useToast();

  const loadLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("auth_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(200);

      if (searchEmail) {
        query = query.ilike("email", `%${searchEmail}%`);
      }

      if (filterEvento !== "todos") {
        query = query.eq("evento", filterEvento);
      }

      if (filterExitoso !== "todos") {
        query = query.eq("exitoso", filterExitoso === "exitoso");
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error: any) {
      console.error("Error cargando logs:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los logs de autenticación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getEventoIcon = (evento: string) => {
    switch (evento) {
      case "login_exitoso":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "login_fallido":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "logout":
        return <LogOut className="h-4 w-4 text-gray-500" />;
      case "intento_facial":
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEventoBadge = (evento: string, exitoso: boolean) => {
    if (evento === "login_exitoso" || (evento === "intento_facial" && exitoso)) {
      return <Badge variant="default" className="bg-green-500">Exitoso</Badge>;
    }
    if (evento === "login_fallido" || (evento === "intento_facial" && !exitoso)) {
      return <Badge variant="destructive">Fallido</Badge>;
    }
    if (evento === "logout") {
      return <Badge variant="secondary">Logout</Badge>;
    }
    return <Badge variant="outline">{evento}</Badge>;
  };

  const getMetodoBadge = (metodo: string | null) => {
    if (!metodo) return <Badge variant="outline">N/A</Badge>;
    
    switch (metodo) {
      case "email_password":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">Email/Password</Badge>;
      case "facial":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-200">Facial</Badge>;
      case "token_refresh":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-200">Token Refresh</Badge>;
      default:
        return <Badge variant="outline">{metodo}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Logs de Autenticación
          </h1>
          <p className="text-muted-foreground mt-1">
            Historial completo de intentos de inicio de sesión
          </p>
        </div>
        <Button onClick={loadLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busca y filtra los logs de autenticación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterEvento} onValueChange={setFilterEvento}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los eventos</SelectItem>
                <SelectItem value="login_exitoso">Login Exitoso</SelectItem>
                <SelectItem value="login_fallido">Login Fallido</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="intento_facial">Intento Facial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterExitoso} onValueChange={setFilterExitoso}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="exitoso">Exitosos</SelectItem>
                <SelectItem value="fallido">Fallidos</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={loadLogs} variant="secondary">
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Autenticación ({logs.length})</CardTitle>
          <CardDescription>
            Los últimos 200 intentos de autenticación registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron logs con los filtros seleccionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{log.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventoIcon(log.evento)}
                          <span className="text-sm">{log.evento.replace(/_/g, " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getMetodoBadge(log.metodo)}</TableCell>
                      <TableCell>{getEventoBadge(log.evento, log.exitoso)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ip_address ? String(log.ip_address) : "N/A"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-red-600">
                        {log.mensaje_error || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}