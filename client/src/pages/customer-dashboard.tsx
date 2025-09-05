import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useLiveTenantPermissions } from "@/hooks/use-live-tenant-permissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomerNavigation, { type CustomerPermissions } from "@/components/customer/customer-navigation";
import { 
  Building,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Globe,
  Download,
  Settings,
  Crown,
  Zap,
  Shield,
  FileText,
  Calendar,
  Clock,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  LogOut,
  MessageCircle
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock tenant ID - In production, get from authentication context  
const mockTenantId = "030d3e01-32c4-4f95-8d54-98be948e8d4b";

const usageData = [
  { month: 'Jan', dataRequests: 1850, apiCalls: 420 },
  { month: 'Feb', dataRequests: 2100, apiCalls: 380 },
  { month: 'Mar', dataRequests: 1950, apiCalls: 450 },
  { month: 'Apr', dataRequests: 2300, apiCalls: 520 },
  { month: 'May', dataRequests: 2200, apiCalls: 480 },
  { month: 'Jun', dataRequests: 2400, apiCalls: 550 },
  { month: 'Jul', dataRequests: 2150, apiCalls: 490 },
  { month: 'Aug', dataRequests: 1247, apiCalls: 312 }
];

const complianceData = [
  { region: 'USA (FDA)', score: 95, alerts: 2, trend: 'up' as const },
  { region: 'EU (EMA)', score: 88, alerts: 5, trend: 'stable' as const },
  { region: 'Asia-Pacific', score: 92, alerts: 1, trend: 'up' as const }
];

const regionDistribution = [
  { name: 'USA', value: 45, color: '#3B82F6' },
  { name: 'Europa', value: 35, color: '#8B5CF6' },
  { name: 'Asien', value: 20, color: '#10B981' }
];

export default function CustomerDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const params = useParams();
  
  // Use tenant ID from URL if available, otherwise use mock ID
  const tenantId = params.tenantId || mockTenantId;
  
  // Use live tenant permissions hook for real-time updates
  const { 
    permissions: livePermissions, 
    tenantName: liveTenantName, 
    isLoading: isTenantLoading 
  } = useLiveTenantPermissions({ 
    tenantId,
    pollInterval: 3000 // Poll alle 3 Sekunden für schnelle Updates
  });
  
  // Use live permissions with fallback
  const permissions = livePermissions || {
    dashboard: true,
    regulatoryUpdates: true,
    legalCases: true,
    knowledgeBase: true,
    newsletters: true,
    analytics: false,
    reports: false,
    dataCollection: false,
    globalSources: false,
    historicalData: false,
    administration: false,
    userManagement: false,
    systemSettings: false,
    auditLogs: false,
    aiInsights: false,
    advancedAnalytics: false
  };
  
  // Fetch customer dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/customer/dashboard', tenantId, selectedTimeRange],
    queryFn: async () => {
      // In production: await fetch(`/api/customer/dashboard/${tenantId}?range=${selectedTimeRange}`)
      return {
        usage: {
          currentMonth: 1247,
          limit: 2500,
          percentage: 50,
          users: 12,
          userLimit: 25,
          apiCalls: 312,
          apiLimit: 1000
        },
        dashboard: {
          regulatoryUpdates: {
            total: 1247,
            thisMonth: 312,
            critical: 23,
            regions: {
              US: 498,
              EU: 436,
              Asia: 313
            }
          },
          compliance: {
            score: 92,
            alerts: 8,
            upcoming: 15,
            resolved: 156
          },
          analytics: {
            riskTrend: 'decreasing',
            engagement: 89,
            efficiency: 94,
            dataQuality: 98
          }
        }
      };
    }
  });

  const StatCard = ({ title, value, change, changeType, icon: Icon, description, color = "blue" }: {
    title: string;
    value: string;
    change?: string;
    changeType?: 'increase' | 'decrease' | 'stable';
    icon: any;
    description?: string;
    color?: string;
  }) => {
    const changeIcon = changeType === 'increase' ? <ArrowUp className="h-3 w-3" /> : 
                      changeType === 'decrease' ? <ArrowDown className="h-3 w-3" /> : 
                      <Minus className="h-3 w-3" />;
    
    const changeColor = changeType === 'increase' ? 'text-green-600' : 
                       changeType === 'decrease' ? 'text-red-600' : 
                       'text-gray-500';

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="text-2xl font-bold">{value}</div>
              {change && (
                <p className={`text-xs ${changeColor} flex items-center gap-1 mt-1`}>
                  {changeIcon}
                  {change}
                </p>
              )}
            </div>
            <div className={`h-12 w-12 rounded-lg bg-${color}-100 dark:bg-${color}-900/20 flex items-center justify-center`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  const ComplianceCard = ({ region, score, alerts, trend }: {
    region: string;
    score: number;
    alerts: number;
    trend: 'up' | 'down' | 'stable';
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">{region}</h4>
          <Badge className={trend === 'up' ? 'bg-green-100 text-green-800' : 
                           trend === 'down' ? 'bg-red-100 text-red-800' : 
                           'bg-blue-100 text-blue-800'}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : 
             trend === 'down' ? <ArrowDown className="w-3 h-3 mr-1" /> : 
             <Minus className="w-3 h-3 mr-1" />}
            {trend}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Compliance Score</span>
            <span className="font-medium">{score}%</span>
          </div>
          <Progress value={score} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{alerts} aktive Warnungen</span>
            <span>{score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : 'Needs Attention'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading || isTenantLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { t } = useLanguage();
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Language Selector - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
      {/* Navigation Sidebar */}
      <CustomerNavigation 
        permissions={permissions}
        tenantName={liveTenantName}
      />
      
      {/* Main Content */}
      <div className="flex-1 ml-64">
        <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Kunden-Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 via-purple-600 to-cyan-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {liveTenantName?.charAt(0) || 'M'}
              </div>
              <span className="font-medium">{liveTenantName || 'MedTech Solutions GmbH'}</span>
            </div>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
              <Crown className="w-3 h-3 mr-1" />
              Professional Plan
            </Badge>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Tage</SelectItem>
              <SelectItem value="30d">30 Tage</SelectItem>
              <SelectItem value="90d">90 Tage</SelectItem>
              <SelectItem value="12m">12 Monate</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <MessageCircle className="w-4 h-4 mr-2" />
            Support Chat
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Einstellungen
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/login'}>
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </div>

      {/* Key Metrics - Only visible with dashboard permission */}
      {permissions?.dashboard && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Monatliche Nutzung"
            value={`${dashboardData?.usage.currentMonth.toLocaleString()} / ${dashboardData?.usage.limit.toLocaleString()}`}
            change="+8.2%"
            changeType="increase"
            icon={Activity}
            description={`${dashboardData?.usage.percentage}% vom Limit verbraucht`}
            color="blue"
          />
          <StatCard
            title="Compliance Score"
            value={`${dashboardData?.dashboard.compliance.score}%`}
            change="+2.1%"
            changeType="increase"
            icon={Shield}
            description={`${dashboardData?.dashboard.compliance.alerts} aktive Warnungen`}
            color="green"
          />
          {permissions?.userManagement && (
            <StatCard
              title="Aktive Benutzer"
              value={`${dashboardData?.usage.users} / ${dashboardData?.usage.userLimit}`}
              change="Stabil"
              changeType="stable"
              icon={Users}
              description="Team-Nutzung im Rahmen"
              color="purple"
            />
          )}
          {permissions?.analytics && (
            <StatCard
              title="Data Quality"
              value={`${dashboardData?.dashboard.analytics.dataQuality}%`}
              change="+1.3%"
              changeType="increase"
              icon={Target}
              description="Datenqualität hervorragend"
              color="orange"
            />
          )}
        </div>
      )}

      {/* Usage Analytics - Only show with analytics permission */}
      {permissions?.analytics && (
        <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Nutzungstrend
            </CardTitle>
            <CardDescription>
              Monatliche Datenabfragen und API-Calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="dataRequests" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="apiCalls" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regionale Verteilung
            </CardTitle>
            <CardDescription>
              Anteil der Updates nach Regionen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={regionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {regionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {regionDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Compliance Overview - Only show with regulatoryUpdates permission */}
      {permissions?.regulatoryUpdates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance-Übersicht
            </CardTitle>
            <CardDescription>
              Regionale Compliance-Scores und aktuelle Warnungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {complianceData.map((item, index) => (
                <ComplianceCard key={index} {...item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity & Alerts - Only show if permitted */}
      {(permissions?.dashboard || permissions?.auditLogs) && (
        <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aktuelle Aktivitäten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'Neue FDA 510(k) Zulassung', time: '2 Stunden', type: 'approval', critical: false },
                { action: 'EU MDR Update verfügbar', time: '5 Stunden', type: 'update', critical: true },
                { action: 'API-Limit zu 75% erreicht', time: '1 Tag', type: 'warning', critical: false },
                { action: 'Compliance-Score aktualisiert', time: '2 Tage', type: 'info', critical: false }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-3">
                    {activity.type === 'approval' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {activity.type === 'update' && <FileText className="h-4 w-4 text-blue-500" />}
                    {activity.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    {activity.type === 'info' && <Activity className="h-4 w-4 text-gray-500" />}
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">vor {activity.time}</p>
                    </div>
                  </div>
                  {activity.critical && (
                    <Badge variant="destructive" className="text-xs">
                      Kritisch
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Aktive Warnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'EU MDR Deadline approaching', severity: 'high', date: '2025-08-15' },
                { title: 'FDA Cybersecurity Requirements', severity: 'medium', date: '2025-09-01' },
                { title: 'API Rate Limit Warning', severity: 'low', date: '2025-08-12' }
              ].map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      alert.severity === 'high' ? 'bg-red-500' :
                      alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">Fällig: {alert.date}</p>
                    </div>
                  </div>
                  <Badge className={
                    alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Subscription Status - Only show with administration or systemSettings permission */}
      {(permissions?.administration || permissions?.systemSettings) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-4">Current Plan: Professional</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monatliche Updates</span>
                    <span className="text-sm font-medium">{dashboardData?.usage.currentMonth} / 2.500</span>
                  </div>
                  <Progress value={dashboardData?.usage.percentage} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Team-Mitglieder</span>
                    <span className="text-sm font-medium">{dashboardData?.usage.users || 0} / {dashboardData?.usage.userLimit || 0}</span>
                  </div>
                  <Progress value={((dashboardData?.usage.users || 0) / (dashboardData?.usage.userLimit || 1)) * 100} />
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-4">Nächste Abrechnung</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Betrag</span>
                    <span className="text-lg font-bold">€899</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Datum</span>
                    <span className="text-sm font-medium">31.08.2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Zahlungsart</span>
                    <span className="text-sm">**** 1234</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Plan verwalten
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        {/* Show message if no dashboard sections are visible */}
        {!permissions?.dashboard && !permissions?.analytics && !permissions?.regulatoryUpdates && 
         !permissions?.administration && !permissions?.systemSettings && !permissions?.auditLogs && (
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Zugriff beschränkt
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Ihr Administrator hat den Zugriff auf diese Dashboard-Bereiche beschränkt. 
                Kontaktieren Sie Ihren Administrator, um weitere Berechtigungen zu erhalten.
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}