import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { type AuthUser } from "wasp/auth";
import { useQuery, getProjectHistory, getProjects, getProjectVulnerabilities, generateReport, getGlobalReport } from "wasp/client/operations";
import { motion } from "framer-motion";
import { cn } from "../../utils";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import ReactApexChart from "react-apexcharts";
import {
  ArrowLeft,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Activity,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Terminal,
  Clock,
  Hash,
  GitBranch,
  Target,
  ListFilter,
  FileText,
  FileJson,
  Download,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "../../components/ui/dropdown-menu";
import { useToast } from "../../components/ui/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface ScanHistoryItem {
  id: string;
  date: string;
  status: string; // 'queued' | 'processing' | 'completed' | 'failed'
  progress: number;
  eta: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  config: {
    doubleCheck: boolean;
    customRules: boolean;
    customRulesQty?: number;
    customRulesModel?: string;
  };
  totalVulns?: number;
  // Evolution metrics
  new_findings_count?: number;
  fixed_findings_count?: number;
  recurring_findings_count?: number;
  net_risk_score?: number;
}

import { ScanReportDialog } from "../../components/sast/ScanReportDialog";

export default function SastProjectHistoryPage({ user }: { user: AuthUser }) {
  const { id } = useParams();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportConfig, setSelectedReportConfig] = useState<{qty?: number, model?: string}>({});
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDownloadGlobalReport = async () => {
    // Resolve real project ID if we have it (from project list or alias resolution), otherwise use param
    const targetId = projectFromList?.id || id;
    if (!targetId) return;

    setDownloadingReport('global');
    try {
      const result = await getGlobalReport({ projectId: targetId });

      // Convert Base64 to Blob
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.contentType });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Generated",
        description: "Successfully downloaded Global Project Report.",
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Could not generate report",
        variant: "destructive"
      });
    } finally {
      setDownloadingReport(null);
    }
  };

  const handleDownloadReport = async (taskId: string, type: string) => {
    setDownloadingReport(`${taskId}-${type}`);
    try {
      const result = await generateReport({ taskId, type });
      
      // Convert base64 to blob
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.contentType });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Generated",
        description: `Successfully downloaded ${type} report.`,
      });

    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Could not generate report",
        variant: "destructive"
      });
    } finally {
      setDownloadingReport(null);
    }
  };

  const handleOpenReport = (scan: ScanHistoryItem) => {
    setSelectedReportId(scan.id);
    setSelectedReportConfig({
      qty: scan.config.customRulesQty,
      model: scan.config.customRulesModel
    });
    setReportDialogOpen(true);
  };
  
  const { data: historyData, isLoading, error } = useQuery(getProjectHistory, { projectId: id || '' }, {
    enabled: !!id,
  });

  const { data: projectsData } = useQuery(getProjects);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Use API data if available, otherwise fall back to mock (or empty)
  const projectFromList = projectsData?.projects?.find((p: any) => p.id === id || p.alias === id);

  const project = historyData ? {
    id: id || 'unknown',
    name: historyData.projectName || historyData.name || projectFromList?.name || id || "Unknown Project",
    repository: historyData.repository || projectFromList?.repository || "Unknown Repo",
    branch: historyData.branch || "main",
    riskScore: historyData.riskScore || "N/A",
    totalScans: historyData.history?.length || 0,
    totalVulnsDetected: historyData.history?.[0]?.totalVulns || 0,
    createdAt: historyData.createdAt || new Date().toISOString(),
    history: historyData.history?.map((item: any) => ({
      id: item.taskId || item.id || 'unknown',
      date: item.created_at || item.date || new Date().toISOString(),
      status: item.status || 'queued',
      progress: item.progress || 0,
      eta: item.eta || 'N/A',
      critical: item.critical || 0,
      high: item.high || 0,
      medium: item.medium || 0,
      low: item.low || 0,
      info: item.info || 0,
      config: {
        doubleCheck: item.config?.doubleCheck || item.double_check || item.is_retest || false,
        customRules: item.config?.customRules || item.custom_rules || false,
        customRulesQty: item.config?.customRulesQty,
        customRulesModel: item.config?.customRulesModel
      },
      totalVulns: item.totalVulns || 0,
      new_findings_count: item.new_findings_count || 0,
      fixed_findings_count: item.fixed_findings_count || 0,
      recurring_findings_count: item.recurring_findings_count || 0,
      net_risk_score: item.net_risk_score || 0
    })) || []
  } : null;

  // Chart Data Preparation (Resolution Dynamics)
  const chartOptions = useMemo(() => ({
    chart: {
      id: "resolution-dynamics",
      stacked: false,
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'monospace',
    },
    plotOptions: {
      bar: {
        columnWidth: '40%',
      }
    },
    xaxis: {
      categories: project?.history.map((scan: ScanHistoryItem) => new Date(scan.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })).reverse(),
      labels: {
        style: { colors: '#64748b' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#64748b' }
      }
    },
    colors: ['#ef4444', '#22c55e', '#64748b'], // Red (New), Green (Fixed), Slate (Backlog)
    stroke: {
      width: [0, 0, 3],
      curve: 'smooth' as const
    },
    legend: {
      position: 'top' as const,
      horizontalAlign: 'right' as const,
      labels: { colors: '#94a3b8' }
    },
    theme: { mode: 'dark' as const },
    grid: {
      borderColor: '#1e293b',
      strokeDashArray: 4,
    },
    dataLabels: { enabled: false }
  }), [project]);

  const chartSeries = useMemo(() => {
      if(!project) return [];
      const reversedHistory = [...project.history].reverse();
      return [
          { 
            name: 'New Issues', 
            type: 'column', 
            data: reversedHistory.map(s => s.new_findings_count || 0) 
          },
          { 
            name: 'Fixed Issues', 
            type: 'column', 
            data: reversedHistory.map(s => -(s.fixed_findings_count || 0)) // Negative for visual effect? Or just positive. Let's keep positive for now to avoid confusion, or negative for "down" bar.
            // Requirement says: "Barra Verde (Hacia abajo): Vulnerabilidades Resueltas". So negative makes sense if we format axis.
            // But standard charts handle mixed positive/negative. Let's try negative values for "Fixed".
          },
          { 
            name: 'Total Backlog', 
            type: 'line', 
            data: reversedHistory.map(s => s.totalVulns || 0) 
          }
      ];
  }, [project]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="h-2 w-24 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 animate-progress origin-left"></div>
        </div>
        <p className="text-slate-500 font-mono text-xs animate-pulse">DECRYPTING MISSION LOGS...</p>
      </div>
    );
  }

  if (error) {
     return <div className="flex items-center justify-center min-h-screen bg-slate-950 text-red-500 font-mono">ERROR: {error.message}</div>;
  }

  if (!project) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-500 font-mono">TARGET NOT FOUND</div>;
  }

  // Calculate Header KPIs
  const latestScan = project.history.length > 0 ? project.history[0] : null;
  const uniqueVulnsNet = latestScan?.totalVulns || 0;
  
  // Simple "Resolution Rate" calculation (Fixed / (Fixed + Recurring + New)) over last 5 scans or total
  // Or just Fixed / (Fixed + Open) for the latest scan?
  // Let's use Cumulative Fixed / Cumulative Found (historical approximation)
  // For now, let's use the latest scan's specific "Fixed" count as a "Velocity" indicator.
  const latestFixed = latestScan?.fixed_findings_count || 0;
  const latestNew = latestScan?.new_findings_count || 0;
  
  // Net Risk Score
  const riskScore = latestScan?.net_risk_score || 0;

  return (
    <div className="min-h-screen bg-transparent text-slate-200 font-sans selection:bg-purple-500/30 p-4 md:p-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header & Breadcrumbs */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-slate-500 tracking-wider">
            <Link to="/sast/projects" className="hover:text-purple-400 transition-colors flex items-center gap-1">
              <Terminal className="h-3 w-3" />
              Projects
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-purple-400 font-bold">{project.name}</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800/50">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-4">
                {project.name}
                <div className="flex flex-col items-start">
                   <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-1">Risk Assessment</span>
                   <Badge variant="outline" className={cn(
                     "text-sm border-0 font-mono tracking-widest px-2 py-0.5",
                     riskScore < 100 ? "bg-green-500/10 text-green-400" :
                     riskScore < 500 ? "bg-yellow-500/10 text-yellow-400" :
                     "bg-red-500/10 text-red-400"
                   )}>
                     SCORE {riskScore}
                   </Badge>
                </div>
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 mt-4 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-black rounded border border-slate-200 dark:border-slate-800">
                  <FileCode className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-500">REPO:</span>
                  <span className="text-slate-700 dark:text-slate-300">{project.repository}</span>
                </div>
              </div>
            </div>

            <Button 
              variant="outline"
              className="mr-4 bg-slate-900/50 hover:bg-slate-800 text-slate-300 border-slate-700 h-12 px-6"
              onClick={handleDownloadGlobalReport}
              disabled={!!downloadingReport}
            >
              {downloadingReport === 'global' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              GLOBAL REPORT
            </Button>

            <Button 
              className="bg-purple-600 hover:bg-purple-500 text-white font-mono tracking-wide shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-400/20 h-12 px-6"
              asChild
            >
              <Link to={`/sast/new?project=${project.id}`}>
                <Terminal className="mr-2 h-4 w-4" />
                INITIALIZE NEW MISSION
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Project KPIs */}
        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
          {/* KPI 1: Net Backlog */}
          <div className="relative group overflow-hidden rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-6">
            <div className="relative z-10">
              <p className="text-[10px] uppercase font-mono text-slate-500 tracking-wider mb-2">Net Backlog</p>
              <div className="text-3xl font-bold text-black dark:text-white font-mono">{uniqueVulnsNet}</div>
              <p className="text-xs text-slate-400 mt-1 font-mono">PENDING ISSUES</p>
            </div>
          </div>

          {/* KPI 2: Velocity (Fixed Last Scan) */}
          <div className="relative group overflow-hidden rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-6">
            <div className="relative z-10">
              <p className="text-[10px] uppercase font-mono text-slate-500 tracking-wider mb-2">Resolution Velocity</p>
              <div className="text-3xl font-bold text-green-500 font-mono">-{latestFixed}</div>
              <p className="text-xs text-green-500/60 mt-1 font-mono">FIXED LAST SCAN</p>
            </div>
          </div>

          {/* KPI 3: Influx (New Last Scan) */}
          <div className="relative group overflow-hidden rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-6">
            <div className="relative z-10">
              <p className="text-[10px] uppercase font-mono text-slate-500 tracking-wider mb-2">Defect Influx</p>
              <div className="text-3xl font-bold text-red-500 font-mono">+{latestNew}</div>
              <p className="text-xs text-red-500/60 mt-1 font-mono">NEW LAST SCAN</p>
            </div>
          </div>
          
           {/* KPI 4: Total Missions */}
           <div className="relative group overflow-hidden rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-6">
            <div className="relative z-10">
              <p className="text-[10px] uppercase font-mono text-slate-500 tracking-wider mb-2">Total Missions</p>
              <div className="text-3xl font-bold text-black dark:text-white font-mono">{project.totalScans}</div>
              <p className="text-xs text-blue-400/80 mt-1 font-mono">LIFETIME EXECUTIONS</p>
            </div>
          </div>
        </motion.div>

        {/* Resolution Dynamics Chart */}
        <motion.div variants={itemVariants} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6 backdrop-blur-sm">
             <div className="mb-6">
                <h3 className="text-sm font-mono uppercase text-black dark:text-white tracking-widest flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Resolution Dynamics
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-1">NEW (RED) VS FIXED (GREEN) VS BACKLOG (LINE)</p>
             </div>
             <div className="h-[350px] w-full">
                <ReactApexChart 
                    options={chartOptions}
                    series={chartSeries as any}
                    type="line"
                    height="100%"
                    width="100%"
                />
             </div>
        </motion.div>

        {/* Tabs: Scan Log vs Project Backlog */}
        <motion.div variants={itemVariants}>
            <Tabs defaultValue="scan-log" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 p-1 border border-slate-800 rounded-lg">
                    <TabsTrigger value="scan-log" className="font-mono text-xs uppercase data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        <ListFilter className="w-3 h-3 mr-2" /> Mission Log
                    </TabsTrigger>
                    <TabsTrigger value="backlog" className="font-mono text-xs uppercase data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        <Target className="w-3 h-3 mr-2" /> Project Backlog (Unique)
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="scan-log" className="mt-6">
                    <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <h3 className="text-sm font-mono uppercase text-black dark:text-white tracking-widest flex items-center gap-2">
                            <Hash className="h-4 w-4" /> Mission Logs
                            </h3>
                            <span className="text-[10px] font-mono text-black dark:text-white">
                            TOTAL RECORDS: {project.history.length}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] uppercase font-mono text-black dark:text-white tracking-wider">
                            <div className="col-span-2">Mission ID</div>
                            <div className="col-span-2">Timestamp</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-4">Evolution (New/Fixed/Total)</div>
                            <div className="col-span-2 text-right">Action</div>
                            </div>

                            {project.history.map((scan: ScanHistoryItem) => (
                            <motion.div 
                                key={scan.id}
                                className={cn(
                                "group relative bg-white dark:bg-black border transition-all duration-300 rounded overflow-hidden",
                                selectedScanId === scan.id 
                                    ? "border-purple-500 ring-1 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]" 
                                    : "border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                )}
                                onClick={() => setSelectedScanId(scan.id)}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center">
                                
                                {/* ID */}
                                <div className="col-span-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                                    <span className="text-slate-400 dark:text-slate-600 mr-1">#</span>
                                    {scan.id.substring(0, 8)}
                                </div>

                                {/* Date */}
                                <div className="col-span-2 flex flex-col">
                                    <span className="text-xs font-mono text-black dark:text-white">
                                    {new Date(scan.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </span>
                                    <span className="text-[10px] font-mono text-black dark:text-white">
                                    {new Date(scan.date).toLocaleTimeString()}
                                    </span>
                                </div>

                                {/* Status Badge */}
                                <div className="col-span-2">
                                    <Badge variant="outline" className={cn(
                                        "text-[10px] py-0 px-1.5 h-5 border-opacity-50",
                                        scan.status === 'processing' ? "border-blue-500 text-blue-400 bg-blue-500/10 animate-pulse" :
                                        scan.status === 'completed' ? "border-green-500 text-green-400 bg-green-500/10" :
                                        scan.status === 'failed' ? "border-red-500 text-red-400 bg-red-500/10" :
                                        "border-slate-500 text-slate-400 bg-slate-500/10"
                                    )}>
                                        {scan.status.toUpperCase()}
                                    </Badge>
                                </div>

                                {/* Evolution Metrics */}
                                <div className="col-span-4 flex items-center gap-4 text-xs font-mono">
                                    {scan.status === 'completed' ? (
                                        <>
                                            <span className="text-red-400" title="New Findings">+{scan.new_findings_count}</span>
                                            <span className="text-green-400" title="Fixed Findings">-{scan.fixed_findings_count}</span>
                                            <span className="text-slate-200 font-bold" title="Total Pending">Σ {scan.totalVulns}</span>
                                        </>
                                    ) : (
                                        <span className="text-slate-500">-</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex justify-end gap-2 items-center">
                                    {scan.config.customRules && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleOpenReport(scan);
                                        }}
                                        title="View Custom Rules Log"
                                      >
                                        <Terminal className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-[10px] font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    asChild
                                    >
                                    <Link to={`/sast/report/${scan.id}`}>
                                        [ SCAN ]
                                    </Link>
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="h-8 text-[10px] font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 gap-2"
                                        >
                                          {downloadingReport?.startsWith(scan.id) ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Download className="h-3 w-3" />
                                          )}
                                          REPORT
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 bg-slate-950 border-slate-800 text-slate-200">
                                        <DropdownMenuLabel className="text-xs font-mono text-slate-500">SELECT FORMAT</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-slate-800" />
                                        
                                        <DropdownMenuItem 
                                          className="text-xs font-mono focus:bg-purple-500/10 focus:text-purple-400 cursor-pointer"
                                          onClick={() => handleDownloadReport(scan.id, 'executive')}
                                          disabled={!!downloadingReport}
                                        >
                                          <FileText className="mr-2 h-3 w-3" />
                                          Executive PDF
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuItem 
                                          className="text-xs font-mono focus:bg-purple-500/10 focus:text-purple-400 cursor-pointer"
                                          onClick={() => handleDownloadReport(scan.id, 'technical')}
                                          disabled={!!downloadingReport}
                                        >
                                          <FileCode className="mr-2 h-3 w-3" />
                                          Technical PDF
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuSeparator className="bg-slate-800" />
                                        
                                        <DropdownMenuItem 
                                          className="text-xs font-mono focus:bg-blue-500/10 focus:text-blue-400 cursor-pointer"
                                          onClick={() => handleDownloadReport(scan.id, 'json')}
                                          disabled={!!downloadingReport}
                                        >
                                          <FileJson className="mr-2 h-3 w-3" />
                                          JSON Export
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuItem 
                                          className="text-xs font-mono focus:bg-blue-500/10 focus:text-blue-400 cursor-pointer"
                                          onClick={() => handleDownloadReport(scan.id, 'xml')}
                                          disabled={!!downloadingReport}
                                        >
                                          <FileCode className="mr-2 h-3 w-3" />
                                          XML Export
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                </div>
                            </motion.div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="backlog" className="mt-6">
                    <ProjectBacklogTab projectId={project.id} />
                </TabsContent>
            </Tabs>
        </motion.div>
      </motion.div>

      <ScanReportDialog 
        taskId={selectedReportId} 
        open={reportDialogOpen} 
        onOpenChange={setReportDialogOpen} 
        defaultConfig={selectedReportConfig}
      />
    </div>
  );
}

// Sub-component for Backlog Tab (Lazy Loaded logic could go here, but we'll fetch in component)
// We need to implement the fetch logic or use a new Wasp query
import { useQuery as useWaspQuery } from "wasp/client/operations";
import axios from "axios";
import { useEffect } from "react";

function ProjectBacklogTab({ projectId }: { projectId: string }) {
    const { data: result, isLoading } = useQuery(getProjectVulnerabilities, { projectId: projectId });
    const vulns = result?.vulnerabilities || [];

    if (isLoading) return <div className="text-center py-10 font-mono text-slate-500 animate-pulse">LOADING BACKLOG...</div>;

    return (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
             <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-900/50">
                        <TableHead className="font-mono text-xs uppercase text-slate-500">Severity</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-slate-500">Vulnerability</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-slate-500">First Seen</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-slate-500">Recurrence</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-slate-500 text-right">Location</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {vulns.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-10 text-slate-500 font-mono">
                                NO ACTIVE VULNERABILITIES IN BACKLOG
                            </TableCell>
                        </TableRow>
                    ) : vulns.map((v: any, i: number) => (
                        <TableRow key={i} className="border-slate-800 hover:bg-slate-900/50">
                            <TableCell>
                                <Badge variant="outline" className={cn(
                                    "text-[10px] w-20 justify-center",
                                    v.severity === 'critical' ? "border-red-500 text-red-400 bg-red-500/10" :
                                    v.severity === 'high' ? "border-orange-500 text-orange-400 bg-orange-500/10" :
                                    v.severity === 'medium' ? "border-blue-500 text-blue-400 bg-blue-500/10" :
                                    "border-slate-500 text-slate-400"
                                )}>
                                    {v.severity.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-300">
                                {v.rule_name}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-500">
                                {new Date(v.first_seen).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-300">
                                {v.recurrence_count} scans
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-500 text-right">
                                {v.file_path}:{v.line}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
        </div>
    );
}
