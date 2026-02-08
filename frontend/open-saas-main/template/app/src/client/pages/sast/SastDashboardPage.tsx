import { useMemo } from "react";
import { Link } from "react-router-dom";
import { type AuthUser } from "wasp/auth";
import { useQuery, checkApiConnection, getSastDashboard } from "wasp/client/operations";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Shield,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Cpu,
  Server,
  AlertOctagon,
  Info,
  Bug,
  Layout,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { cn } from "../../utils";

interface Scan {
  id: string;
  project: string;
  status: string;
  date: string;
  taskId: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export default function SastDashboardPage({ user }: { user: AuthUser }) {
  const { data: apiStatus } = useQuery(checkApiConnection);
  const { data: dashboardData, isLoading } = useQuery(getSastDashboard);

  // --- Data Processing & Logic ---

  // 1. Calculate Health Score (0-100)
  const healthScore = useMemo(() => {
    if (!dashboardData?.severity) return 100;
    const { critical, high, medium, low } = dashboardData.severity;
    
    // Weighted penalties
    const penalty = (critical * 25) + (high * 10) + (medium * 5) + (low * 1);
    const score = Math.max(0, 100 - penalty);
    return Math.round(score);
  }, [dashboardData]);

  // 2. Determine DEFCON Level / Status Color
  const statusColor = useMemo(() => {
    if (healthScore >= 90) return "text-green-500";
    if (healthScore >= 70) return "text-yellow-500";
    if (healthScore >= 50) return "text-orange-500";
    return "text-red-500";
  }, [healthScore]);

  // 3. Prepare Chart Data
  const chartData = useMemo(() => {
    if (!dashboardData?.severity) return [];
    return [
      { name: "Critical", value: dashboardData.severity.critical, color: "#ef4444" }, // red-500
      { name: "High", value: dashboardData.severity.high, color: "#f97316" }, // orange-500
      { name: "Medium", value: dashboardData.severity.medium, color: "#eab308" }, // yellow-500
      { name: "Low", value: dashboardData.severity.low, color: "#3b82f6" }, // blue-500
      { name: "Info", value: dashboardData.severity.info, color: "#64748b" }, // slate-500
    ].filter(item => item.value > 0);
  }, [dashboardData]);

  const recentScans = dashboardData?.recentScans || [];

  // --- Render Helpers ---

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getRiskRatio = () => {
    const vulns = dashboardData?.stats?.totalVulns || 0;
    const projects = dashboardData?.stats?.totalProjects || 1; // avoid division by zero
    return (vulns / (projects || 1)).toFixed(1);
  };

  const getSeverityIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return <AlertOctagon className="h-4 w-4 text-red-500" />;
      case 'high': return <ShieldAlert className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'processing':
      case 'scanning':
      case 'queued':
        return <Badge variant="outline" className="border-blue-500 text-blue-500 gap-1 animate-pulse"><Activity className="h-3 w-3" /> Processing</Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertOctagon className="h-3 w-3" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-slate-400 font-mono animate-pulse">INITIALIZING SECURITY PROTOCOLS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-black dark:text-white p-6 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 dark:border-slate-800 pb-6"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-500" />
              Security Command Center
            </h1>
            <p className="text-white mt-1 flex items-center gap-2 text-sm">
              <Terminal className="h-4 w-4" />
              System Status: 
              {apiStatus ? (
                <span className="text-green-600 dark:text-green-500 flex items-center gap-1 font-mono"><Wifi className="h-3 w-3" /> ONLINE</span>
              ) : (
                <span className="text-red-600 dark:text-red-500 flex items-center gap-1 font-mono"><WifiOff className="h-3 w-3" /> OFFLINE</span>
              )}
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
             <Button variant="outline" className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white" onClick={() => window.location.reload()}>
                <Activity className="mr-2 h-4 w-4" /> Refresh
             </Button>
             <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20" asChild>
                <Link to="/sast/new">
                  <Zap className="mr-2 h-4 w-4" /> New Scan
                </Link>
             </Button>
          </div>
        </motion.div>

        {/* --- HUD SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Health Shield */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white dark:bg-black border-slate-200 dark:border-slate-800 backdrop-blur-sm relative overflow-hidden h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-black dark:text-white uppercase tracking-widest">Global Health Shield</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className={cn("text-5xl font-bold font-mono", statusColor)}>
                    {healthScore}%
                  </span>
                  <span className="text-black dark:text-white mb-2 text-sm font-mono">/ 100</span>
                </div>
                <Progress value={healthScore} className="h-2 mt-4 bg-slate-200 dark:bg-slate-800" indicatorClassName={cn(healthScore < 50 ? "bg-red-500" : "bg-blue-500")} />
                <p className="text-xs text-black dark:text-white mt-2 flex items-center gap-1">
                   {healthScore < 50 ? <AlertTriangle className="h-3 w-3 text-red-500"/> : <CheckCircle2 className="h-3 w-3 text-green-500"/>}
                   {healthScore < 50 ? "Critical vulnerabilities detected" : "System operational within parameters"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Ops */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white dark:bg-black border-slate-200 dark:border-slate-800 backdrop-blur-sm relative overflow-hidden h-full">
              
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Active Operations Center
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-bold font-mono text-blue-500 dark:text-blue-400">
                    {dashboardData?.stats?.activeScans || 0}
                  </span>
                  <span className="text-black dark:text-white mb-2 text-sm">active missions</span>
                </div>
                
                <div className="mt-4 flex items-center gap-2">
                   {(dashboardData?.stats?.activeScans || 0) > 0 ? (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                   ) : (
                      <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                   )}
                   <span className="text-xs font-mono text-blue-500 dark:text-blue-300">
                      {(dashboardData?.stats?.activeScans || 0) > 0 ? "SCANNING SECTOR..." : "MONITORING MODE"}
                   </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Resource Fuel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white dark:bg-black border-slate-200 dark:border-slate-800 backdrop-blur-sm relative overflow-hidden h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-black dark:text-white uppercase tracking-widest">Resource Fuel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-bold font-mono text-yellow-500">
                    {dashboardData?.stats?.credits || 0}
                  </span>
                  <span className="text-black dark:text-white mb-2 text-sm">credits</span>
                </div>
                 <div className="mt-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${Math.min((dashboardData?.stats?.credits || 0) / 10, 100)}%` }} 
                    />
                 </div>
                <p className="text-xs text-black dark:text-white mt-2">
                   {dashboardData?.stats?.totalProjects || 0} active projects consuming resources.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* --- MAIN DASHBOARD CONTENT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* THREAT LANDSCAPE (Chart) */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white dark:bg-black border-slate-200 dark:border-slate-800 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                  <Bug className="h-5 w-5 text-red-500" />
                  Threat Landscape
                </CardTitle>
                <p className="text-xs text-black dark:text-white">Vulnerability distribution by severity</p>
              </CardHeader>
              <CardContent>
                <div className="mt-4 space-y-6">
                   {/* Vulnerability Severity Spectrum (Horizontal Stacked Bar) */}
                   <div>
                      <div className="flex justify-between text-xs text-black dark:text-white mb-2 uppercase tracking-wider font-semibold">
                         <span>Severity Spectrum</span>
                         <span>{dashboardData?.stats?.totalVulns || 0} Total</span>
                      </div>
                      <div className="flex h-8 w-full rounded-md overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                         {chartData.map((item, index) => {
                            const total = dashboardData?.stats?.totalVulns || 1;
                            const width = (item.value / total) * 100;
                            return (
                               <div 
                                  key={item.name} 
                                  className="h-full flex items-center justify-center transition-all duration-300 hover:brightness-110 relative group"
                                  style={{ width: `${width}%`, backgroundColor: item.color }}
                               >
                                  {width > 10 && <span className="text-[10px] font-bold text-black/50 truncate px-1">{item.value}</span>}
                                  
                                  {/* Tooltip on hover */}
                                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 text-black dark:text-white text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                     {item.name}: {item.value}
                                  </div>
                               </div>
                            );
                         })}
                         {chartData.length === 0 && <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500">SAFE</div>}
                      </div>
                      <div className="flex justify-between mt-2 gap-2 flex-wrap">
                         {chartData.map((item) => (
                            <div key={item.name} className="flex items-center gap-1.5">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                               <span className="text-[10px] text-black dark:text-white uppercase">{item.name}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Asset Coverage (Mini Cards) */}
                   <div className="grid grid-cols-1 gap-3 mt-8">
                      <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-900 rounded text-purple-500"><Layout className="h-4 w-4" /></div>
                            <div>
                               <p className="text-xs text-black dark:text-white uppercase font-semibold">Projects Monitored</p>
                               <p className="text-lg font-mono text-black dark:text-white">{dashboardData?.stats?.totalProjects || 0}</p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-red-500/30 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-900 rounded text-red-500"><Bug className="h-4 w-4" /></div>
                            <div>
                               <p className="text-xs text-black dark:text-white uppercase font-semibold">Total Findings</p>
                               <p className="text-lg font-mono text-black dark:text-white">{dashboardData?.stats?.totalVulns || 0}</p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-900 rounded text-yellow-500"><Activity className="h-4 w-4" /></div>
                            <div>
                               <p className="text-xs text-black dark:text-white uppercase font-semibold">Risk Ratio</p>
                               <p className="text-lg font-mono text-black dark:text-white">{getRiskRatio()} <span className="text-xs text-slate-500 dark:text-slate-600">vulns/proj</span></p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* LIVE OPERATIONS FEED (Recent Scans) */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-white dark:bg-black border-slate-200 dark:border-slate-800 h-full">
               <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                      <Activity className="h-5 w-5 text-blue-500" />
                      Live Operations Feed
                    </CardTitle>
                    <p className="text-xs text-black dark:text-white">Recent security audits and results</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-black dark:text-white hover:text-blue-500" asChild>
                    <Link to="/sast/projects">View All Projects <ArrowRight className="ml-1 h-3 w-3"/></Link>
                  </Button>
               </CardHeader>
               <CardContent className="px-0">
                  <div className="space-y-1">
                    {recentScans.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Terminal className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No operations recorded.</p>
                      </div>
                    ) : (
                      recentScans.map((scan: Scan, i: number) => (
                        <div 
                          key={scan.id || i} 
                          className="group flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 border-l-2 border-transparent hover:border-blue-500 transition-all cursor-default"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 group-hover:border-blue-500/30 transition-colors">
                               {/* Project Identity Avatar */}
                               <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs rounded">
                                  {scan.project.substring(0, 2).toUpperCase()}
                               </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-black dark:text-white">{scan.project}</h4>
                                <div className="hidden sm:block">
                                   {getStatusBadge(scan.status)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                                <span className="flex items-center gap-1 text-black dark:text-white">
                                   <Clock className="h-3 w-3" /> {timeAgo(scan.date)}
                                </span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-black dark:text-white select-all cursor-copy hover:text-blue-500 transition-colors">
                                   #{scan.taskId.substring(0, 6)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            {/* Findings Sparkline (Mini Color Bar) */}
                            <div className="hidden sm:flex flex-col gap-1 w-24">
                               <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                                  {(scan.critical > 0) && <div className="h-full bg-red-500" style={{ width: `${(scan.critical / (scan.critical + scan.high + scan.medium + scan.low + 1)) * 100}%` }} />}
                                  {(scan.high > 0) && <div className="h-full bg-orange-500" style={{ width: `${(scan.high / (scan.critical + scan.high + scan.medium + scan.low + 1)) * 100}%` }} />}
                                  {(scan.medium > 0) && <div className="h-full bg-yellow-500" style={{ width: `${(scan.medium / (scan.critical + scan.high + scan.medium + scan.low + 1)) * 100}%` }} />}
                                  {(scan.low > 0) && <div className="h-full bg-blue-500" style={{ width: `${(scan.low / (scan.critical + scan.high + scan.medium + scan.low + 1)) * 100}%` }} />}
                               </div>
                               <div className="flex justify-between text-[9px] text-slate-500 font-mono px-0.5">
                                  <span>{scan.critical + scan.high + scan.medium + scan.low} Findings</span>
                               </div>
                            </div>

                            <Button size="sm" variant="ghost" className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20" asChild>
                              <Link to={`/sast/report/${scan.taskId}`}>
                                Analyze <ArrowRight className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
