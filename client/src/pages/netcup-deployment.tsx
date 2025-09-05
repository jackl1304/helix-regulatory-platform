import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Server, 
  Database, 
  Globe, 
  Shield, 
  Activity, 
  Terminal, 
  Upload, 
  Download, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Settings,
  Monitor,
  FileText,
  Cpu,
  HardDrive,
  Network,
  Lock
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DeploymentStatus {
  status: 'idle' | 'deploying' | 'running' | 'error' | 'stopped';
  progress: number;
  serverIp: string;
  domain: string;
  sslEnabled: boolean;
  lastDeployment: string;
  uptime: string;
  version: string;
}

interface ServerMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  pm2Status: Array<{
    name: string;
    status: string;
    cpu: number;
    memory: string;
    restarts: number;
  }>;
}

interface DeploymentConfig {
  serverIp: string;
  domain: string;
  databaseUrl: string;
  sslEnabled: boolean;
  nodeEnv: string;
  sessionSecret: string;
  gmailUser: string;
  gmailPassword: string;
  autoBackup: boolean;
  monitoring: boolean;
}

export default function NetcupDeployment() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>({
    serverIp: "152.53.191.99",
    domain: "helix.ihre-domain.de",
    databaseUrl: "postgresql://helix_user:***@localhost:5432/helix_production",
    sslEnabled: true,
    nodeEnv: "production",
    sessionSecret: "***",
    gmailUser: "deltawayshelixinfo@gmail.com",
    gmailPassword: "***",
    autoBackup: true,
    monitoring: true
  });

  const queryClient = useQueryClient();

  // Mock deployment status data
  const { data: deploymentStatus, isLoading: statusLoading } = useQuery<DeploymentStatus>({
    queryKey: ['/api/deployment/status'],
    queryFn: () => ({
      status: 'running',
      progress: 100,
      serverIp: "152.53.191.99",
      domain: "helix.ihre-domain.de",
      sslEnabled: true,
      lastDeployment: "2025-09-03T15:30:00Z",
      uptime: "12d 4h 23m",
      version: "v1.0.0-production"
    }),
    refetchInterval: 30000
  });

  // Mock server metrics data
  const { data: serverMetrics, isLoading: metricsLoading } = useQuery<ServerMetrics>({
    queryKey: ['/api/deployment/metrics'],
    queryFn: () => ({
      cpu: 25,
      memory: 68,
      disk: 45,
      network: 12,
      pm2Status: [
        { name: "helix-production", status: "online", cpu: 2.1, memory: "245.2mb", restarts: 0 },
        { name: "nginx", status: "online", cpu: 0.5, memory: "45.1mb", restarts: 0 },
        { name: "postgresql", status: "online", cpu: 1.8, memory: "128.4mb", restarts: 1 }
      ]
    }),
    refetchInterval: 5000
  });

  // Deployment mutations
  const deployMutation = useMutation({
    mutationFn: async (action: 'deploy' | 'restart' | 'stop') => {
      // Simulate deployment API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, action };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deployment/status'] });
    }
  });

  const handleDeploy = (action: 'deploy' | 'restart' | 'stop') => {
    deployMutation.mutate(action);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'deploying': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      case 'stopped': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="h-4 w-4" />;
      case 'deploying': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'stopped': return <Pause className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Netcup Deployment</h1>
          <p className="text-muted-foreground">
            Helix Platform auf netcup VPS 250 G11s verwalten
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            className={`${getStatusColor(deploymentStatus?.status || 'idle')} text-white`}
            data-testid="deployment-status-badge"
          >
            {getStatusIcon(deploymentStatus?.status || 'idle')}
            <span className="ml-1">{deploymentStatus?.status?.toUpperCase() || 'UNKNOWN'}</span>
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <Button 
          onClick={() => handleDeploy('deploy')} 
          disabled={deployMutation.isPending}
          data-testid="button-deploy"
        >
          <Upload className="h-4 w-4 mr-2" />
          Deploy
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleDeploy('restart')}
          disabled={deployMutation.isPending}
          data-testid="button-restart"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Restart
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleDeploy('stop')}
          disabled={deployMutation.isPending}
          data-testid="button-stop"
        >
          <Pause className="h-4 w-4 mr-2" />
          Stop
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="config" data-testid="tab-config">Konfiguration</TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Logs</TabsTrigger>
          <TabsTrigger value="migration" data-testid="tab-migration">Migration</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-server-status">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Server Status</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-server-ip">
                  {deploymentStatus?.serverIp || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  netcup VPS 250 G11s
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-domain-status">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Domain</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-domain">
                  {deploymentStatus?.domain || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {deploymentStatus?.sslEnabled ? '🔒 SSL aktiv' : '⚠️ SSL inaktiv'}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-uptime">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-uptime">
                  {deploymentStatus?.uptime || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Seit {deploymentStatus?.lastDeployment ? new Date(deploymentStatus.lastDeployment).toLocaleDateString('de-DE') : 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-version">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Version</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-version">
                  {deploymentStatus?.version || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Production Build
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Server Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-cpu-usage">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Nutzung</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-cpu-percentage">
                  {serverMetrics?.cpu || 0}%
                </div>
                <Progress value={serverMetrics?.cpu || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card data-testid="card-memory-usage">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RAM Nutzung</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-memory-percentage">
                  {serverMetrics?.memory || 0}%
                </div>
                <Progress value={serverMetrics?.memory || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card data-testid="card-disk-usage">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Festplatte</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-disk-percentage">
                  {serverMetrics?.disk || 0}%
                </div>
                <Progress value={serverMetrics?.disk || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card data-testid="card-network-usage">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Netzwerk</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-network-percentage">
                  {serverMetrics?.network || 0} MB/s
                </div>
                <p className="text-xs text-muted-foreground">
                  Durchschnitt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* PM2 Processes */}
          <Card data-testid="card-pm2-processes">
            <CardHeader>
              <CardTitle>PM2 Prozesse</CardTitle>
              <CardDescription>Status aller laufenden Services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serverMetrics?.pm2Status?.map((process, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`process-${process.name}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${process.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <p className="font-medium" data-testid={`text-process-name-${index}`}>{process.name}</p>
                        <p className="text-sm text-muted-foreground">
                          CPU: {process.cpu}% | RAM: {process.memory} | Restarts: {process.restarts}
                        </p>
                      </div>
                    </div>
                    <Badge variant={process.status === 'online' ? 'default' : 'destructive'} data-testid={`badge-process-status-${index}`}>
                      {process.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card data-testid="card-deployment-config">
            <CardHeader>
              <CardTitle>Deployment Konfiguration</CardTitle>
              <CardDescription>Server und Anwendungseinstellungen verwalten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serverIp">Server IP</Label>
                  <Input 
                    id="serverIp" 
                    value={deploymentConfig.serverIp} 
                    onChange={(e) => setDeploymentConfig(prev => ({...prev, serverIp: e.target.value}))}
                    data-testid="input-server-ip"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input 
                    id="domain" 
                    value={deploymentConfig.domain} 
                    onChange={(e) => setDeploymentConfig(prev => ({...prev, domain: e.target.value}))}
                    data-testid="input-domain"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nodeEnv">Node Environment</Label>
                  <Input 
                    id="nodeEnv" 
                    value={deploymentConfig.nodeEnv} 
                    onChange={(e) => setDeploymentConfig(prev => ({...prev, nodeEnv: e.target.value}))}
                    data-testid="input-node-env"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmailUser">Gmail User</Label>
                  <Input 
                    id="gmailUser" 
                    value={deploymentConfig.gmailUser} 
                    onChange={(e) => setDeploymentConfig(prev => ({...prev, gmailUser: e.target.value}))}
                    data-testid="input-gmail-user"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="databaseUrl">Database URL</Label>
                <Input 
                  id="databaseUrl" 
                  type="password" 
                  value={deploymentConfig.databaseUrl} 
                  onChange={(e) => setDeploymentConfig(prev => ({...prev, databaseUrl: e.target.value}))}
                  data-testid="input-database-url"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>SSL aktiviert</Label>
                  <p className="text-sm text-muted-foreground">HTTPS mit Let's Encrypt</p>
                </div>
                <Switch 
                  checked={deploymentConfig.sslEnabled} 
                  onCheckedChange={(checked) => setDeploymentConfig(prev => ({...prev, sslEnabled: checked}))}
                  data-testid="switch-ssl-enabled"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto Backup</Label>
                  <p className="text-sm text-muted-foreground">Tägliche Datenbank-Backups</p>
                </div>
                <Switch 
                  checked={deploymentConfig.autoBackup} 
                  onCheckedChange={(checked) => setDeploymentConfig(prev => ({...prev, autoBackup: checked}))}
                  data-testid="switch-auto-backup"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Monitoring aktiviert</Label>
                  <p className="text-sm text-muted-foreground">Server-Überwachung und Alerts</p>
                </div>
                <Switch 
                  checked={deploymentConfig.monitoring} 
                  onCheckedChange={(checked) => setDeploymentConfig(prev => ({...prev, monitoring: checked}))}
                  data-testid="switch-monitoring"
                />
              </div>

              <Button className="w-full" data-testid="button-save-config">
                <Settings className="h-4 w-4 mr-2" />
                Konfiguration speichern
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-health-checks">
              <CardHeader>
                <CardTitle>Health Checks</CardTitle>
                <CardDescription>Automatische Systemprüfungen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Application Server</span>
                    <Badge variant="default" data-testid="badge-app-server-health">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database Connection</span>
                    <Badge variant="default" data-testid="badge-db-health">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SSL Certificate</span>
                    <Badge variant="default" data-testid="badge-ssl-health">Valid (90 Tage)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Email Service</span>
                    <Badge variant="default" data-testid="badge-email-health">Working</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Backup System</span>
                    <Badge variant="default" data-testid="badge-backup-health">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-alerts">
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
                <CardDescription>Wichtige Benachrichtigungen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert data-testid="alert-ssl-renewal">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      SSL-Zertifikat wird in 30 Tagen automatisch erneuert
                    </AlertDescription>
                  </Alert>
                  <Alert data-testid="alert-disk-space">
                    <HardDrive className="h-4 w-4" />
                    <AlertDescription>
                      Festplattenspeicher: 45% verwendet (OK)
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card data-testid="card-deployment-logs">
            <CardHeader>
              <CardTitle>Deployment Logs</CardTitle>
              <CardDescription>Live-Logs vom Server</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full border rounded-md p-4" data-testid="logs-scroll-area">
                <div className="font-mono text-sm space-y-1">
                  <div>[2025-09-03 19:30:37] [INFO] Application started successfully</div>
                  <div>[2025-09-03 19:30:38] [INFO] Database connection established</div>
                  <div>[2025-09-03 19:30:39] [INFO] PM2 process helix-production started</div>
                  <div>[2025-09-03 19:30:40] [INFO] Nginx reverse proxy configured</div>
                  <div>[2025-09-03 19:30:41] [INFO] SSL certificate valid until 2025-12-03</div>
                  <div>[2025-09-03 19:30:42] [INFO] Health check endpoint responding</div>
                  <div>[2025-09-03 19:30:43] [INFO] Email service configured with Gmail SMTP</div>
                  <div>[2025-09-03 19:30:44] [INFO] Backup system initialized</div>
                  <div>[2025-09-03 19:30:45] [INFO] Monitoring systems active</div>
                  <div>[2025-09-03 19:30:46] [INFO] 🚀 Helix Platform ready on https://helix.ihre-domain.de</div>
                </div>
              </ScrollArea>
              <div className="flex space-x-2 mt-4">
                <Button variant="outline" size="sm" data-testid="button-refresh-logs">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Logs aktualisieren
                </Button>
                <Button variant="outline" size="sm" data-testid="button-download-logs">
                  <Download className="h-4 w-4 mr-2" />
                  Logs herunterladen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Migration Tab */}
        <TabsContent value="migration" className="space-y-6">
          <Card data-testid="card-migration-guide">
            <CardHeader>
              <CardTitle>Netcup Migration Guide</CardTitle>
              <CardDescription>Schritt-für-Schritt Anleitung für den Umzug</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">1</div>
                  <div>
                    <h3 className="font-semibold">Webhosting-Daten sichern</h3>
                    <p className="text-sm text-muted-foreground">FTP-Dateien und MySQL-Datenbanken von Webhosting 1000 herunterladen</p>
                  </div>
                  <Badge variant="default">Erledigt</Badge>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">2</div>
                  <div>
                    <h3 className="font-semibold">VPS 250 Setup</h3>
                    <p className="text-sm text-muted-foreground">Ubuntu 22.04, Node.js 20, PostgreSQL 15, Nginx installieren</p>
                  </div>
                  <Badge variant="default">Erledigt</Badge>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">3</div>
                  <div>
                    <h3 className="font-semibold">Helix Platform deployen</h3>
                    <p className="text-sm text-muted-foreground">Git Repository klonen und automatisches Deployment ausführen</p>
                  </div>
                  <Badge variant="default">Erledigt</Badge>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">4</div>
                  <div>
                    <h3 className="font-semibold">DNS umstellen</h3>
                    <p className="text-sm text-muted-foreground">A-Record auf VPS-IP (152.53.191.99) zeigen lassen</p>
                  </div>
                  <Badge variant="outline">In Bearbeitung</Badge>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold">5</div>
                  <div>
                    <h3 className="font-semibold">SSL-Zertifikat aktivieren</h3>
                    <p className="text-sm text-muted-foreground">Let's Encrypt für HTTPS konfigurieren</p>
                  </div>
                  <Badge variant="secondary">Ausstehend</Badge>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold">6</div>
                  <div>
                    <h3 className="font-semibold">Final Testing</h3>
                    <p className="text-sm text-muted-foreground">Alle Funktionen testen und Go-Live</p>
                  </div>
                  <Badge variant="secondary">Ausstehend</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold">Quick Commands</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" data-testid="button-ssh-connect">
                    <Terminal className="h-4 w-4 mr-2" />
                    SSH verbinden
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-backup-create">
                    <Database className="h-4 w-4 mr-2" />
                    Backup erstellen
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-ssl-setup">
                    <Lock className="h-4 w-4 mr-2" />
                    SSL einrichten
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-dns-guide">
                    <Globe className="h-4 w-4 mr-2" />
                    DNS Guide
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}