import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction, getScanResults, runDoubleCheck } from "wasp/client/operations";
import {
  Card,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Separator } from "../../components/ui/separator";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { cn } from "../../utils";
import {
  ShieldAlert,
  ShieldCheck,
  FileCode,
  AlertTriangle,
  Bug,
  Lightbulb,
  ArrowLeft,
  AlertOctagon,
  Info,
  Brain,
  Code2,
  Terminal,
  ChevronRight,
  Bot,
  Filter as FilterIcon,
  Search as SearchIcon,
  Copy,
  Check,
  FolderTree,
  File,
  Folder
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ScanReportDialog } from "../../components/sast/ScanReportDialog";

const ExpandableContent = ({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  // Simple heuristic: if text is long enough to likely wrap 3-4 lines
  const isLong = content.length > 350; 

  return (
    <div className="relative flex-1 flex flex-col">
      <div className={cn(
        "text-white transition-all flex-1", 
        !expanded && isLong ? "max-h-[6rem] overflow-hidden" : "",
        isLong ? "mb-6" : "" // Use margin instead of padding to ensure space is reserved outside the clipped area
      )}>
         <ReactMarkdown components={{ 
            li: ({node, ...props}) => <li className="text-white" {...props} />,
            p: ({node, ...props}) => <p className="text-white" {...props} />
         }}>
           {content}
         </ReactMarkdown>
      </div>
      {isLong && (
        <div className="absolute bottom-0 right-0">
           <Badge 
             variant="outline" 
             className="text-[9px] h-5 px-1.5 cursor-pointer bg-background hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm border-primary/20"
             onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
           >
             {expanded ? "LESS" : "MORE"}
           </Badge>
        </div>
      )}
    </div>
  );
};

const getLanguageFromPath = (filePath: string): string => {
  if (!filePath) return 'text';
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'rb':
      return 'ruby';
    case 'php':
      return 'php';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'hpp':
    case 'cc':
      return 'cpp';
    case 'rs':
      return 'rust';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'json':
      return 'json';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'sql':
      return 'sql';
    case 'xml':
      return 'xml';
    case 'dockerfile':
      return 'dockerfile';
    default:
      return 'text';
  }
};

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  findingsCount: number;
  children?: FileNode[];
}

const buildSourceTree = (findings: any[]): FileNode[] => {
  const root: FileNode[] = [];
  
  for (const f of findings) {
    const parts = (f.file_path || '').split('/');
    let currentLevel = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      
      const isFile = i === parts.length - 1;
      
      let node = currentLevel.find(n => n.name === part);
      
      if (!node) {
        node = {
          name: part,
          type: isFile ? 'file' : 'directory',
          findingsCount: 0,
          children: isFile ? undefined : []
        };
        currentLevel.push(node);
      }
      
      node.findingsCount++;
      
      if (!isFile && node.children) {
        currentLevel = node.children;
      }
    }
  }
  return root;
};

const FileTreeNode = ({ node, depth = 0 }: { node: FileNode, depth?: number }) => {
  const [isOpen, setIsOpen] = useState(depth < 1);
  
  if (node.type === 'file') {
    return (
      <div className="flex items-center gap-2 py-1 hover:bg-muted/50 rounded px-2" style={{ paddingLeft: (depth * 12) + 8 }}>
        <File className="h-3 w-3 text-slate-400" />
        <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{node.name}</span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">({node.findingsCount})</span>
      </div>
    );
  }

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded px-2 cursor-pointer select-none group" 
        style={{ paddingLeft: (depth * 12) + 8 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="relative">
           <Folder className={cn("h-4 w-4 text-indigo-500 transition-colors", isOpen ? "fill-indigo-500/20" : "")} />
           {node.findingsCount > 0 && (
             <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
           )}
        </div>
        <span className={cn("text-sm font-medium transition-colors", isOpen ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300")}>
          {node.name}
        </span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 min-w-[20px] justify-center bg-slate-100 text-slate-600 group-hover:bg-white group-hover:shadow-sm">
          {node.findingsCount}
        </Badge>
      </div>
      {isOpen && node.children && (
        <div className="border-l border-indigo-100 dark:border-indigo-900/30 ml-4 my-1">
           {node.children
             .sort((a, b) => b.findingsCount - a.findingsCount)
             .map((child, i) => (
               <FileTreeNode key={i} node={child} depth={depth + 1} />
           ))}
        </div>
      )}
    </div>
  );
};

export default function SastReportPage({ user }: { user: AuthUser }) {
  const { taskId } = useParams();
  const { data: report, isLoading, error, refetch } = useQuery(getScanResults, { taskId: taskId || "" }, { enabled: !!taskId });
  const runDoubleCheckFn = useAction(runDoubleCheck);
  // const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [customRulesOpen, setCustomRulesOpen] = useState(false);
  
  const [selectedFindingId, setSelectedFindingId] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string[]>(["critical", "high", "medium", "low", "info"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiFilter, setAiFilter] = useState<'all' | 'lynceus' | 'sync'>('all');
  const [copied, setCopied] = useState(false);
  const [selectedForDoubleCheck, setSelectedForDoubleCheck] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isProcessingDoubleCheck, setIsProcessingDoubleCheck] = useState(false);
  const [modelSelectionId, setModelSelectionId] = useState<string | null>(null);
  const [selectedModelType, setSelectedModelType] = useState<string>("standard");

  const toggleDoubleCheck = (id: string) => {
    setSelectedForDoubleCheck(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRunDoubleCheckWithModel = async (id: string, model: string) => {
    if (isProcessingDoubleCheck) return;
    setIsProcessingDoubleCheck(true);
    const startTime = Date.now();

    try {
      await runDoubleCheckFn({ 
        findingIds: [id], 
        model, 
        projectName: report?.projectAlias || "Unknown Project" 
      });
      
      const elapsed = Date.now() - startTime;
      const minDelay = 3000; // Minimum 3 seconds animation
      if (elapsed < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
      }

      setModelSelectionId(null);
      await refetch();
    } catch (error) {
      console.error("Double check failed:", error);
      alert("Double check failed. Please check your credits or try again.");
    } finally {
      setIsProcessingDoubleCheck(false);
    }
  };

  const handleRunDoubleCheck = async () => {
    if (selectedForDoubleCheck.length === 0) return;
    
    setIsProcessingDoubleCheck(true);
    const startTime = Date.now();

    try {
      console.log("Running double check for:", selectedForDoubleCheck);
      
      await runDoubleCheckFn({ 
        findingIds: selectedForDoubleCheck, 
        model: selectedModelType,
        projectName: report?.projectAlias || "Unknown Project"
      });
      
      // Ensure minimum 3 seconds animation
      const elapsed = Date.now() - startTime;
      if (elapsed < 3000) {
        await new Promise(resolve => setTimeout(resolve, 3000 - elapsed));
      }
      
      // Clear selection after success
      setSelectedForDoubleCheck([]);
      // Refresh data to show new analysis
      await refetch();
    } catch (error) {
      console.error("Double check failed:", error);
      alert("Double check failed. Please check your credits or try again.");
    } finally {
      setIsProcessingDoubleCheck(false);
    }
  };

  // Process findings: Add unique UI ID and sort by severity
  const processedFindings = useMemo(() => {
    if (!report?.result?.findings) return [];
    
    const severityWeights = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    
    return report.result.findings.map((f: any, index: number) => ({
      ...f,
      _uiId: `${f.id}-${index}` // Ensure uniqueness
    })).sort((a: any, b: any) => {
       const weightA = severityWeights[a.severity.toLowerCase() as keyof typeof severityWeights] || 0;
       const weightB = severityWeights[b.severity.toLowerCase() as keyof typeof severityWeights] || 0;
       return weightB - weightA; // Descending order
    });
  }, [report]);

    const filteredFindings = useMemo(() => 
    processedFindings.filter((finding: any) => {
      let matches = severityFilter.includes(finding.severity);

      matches = matches && (
        finding.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        finding.file_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        finding.id.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // In selection mode, only show findings that haven't been double checked yet
      if (isSelectionMode) {
        matches = matches && !finding.analysis_json?.double_check;
      }

      if (aiFilter === 'lynceus') {
        // Show only findings analyzed by Lynceus (Double Check)
        matches = matches && !!finding.analysis_json?.double_check;
      } else if (aiFilter === 'sync') {
        // Show only findings where Argus and Lynceus agree
        const hasDoubleCheck = !!finding.analysis_json?.double_check;
        const argusTriage = finding.analysis_json?.triage;
        const lynceusTriage = hasDoubleCheck ? finding.analysis_json?.double_check?.triage : null;
        const hasConsensus = hasDoubleCheck && (argusTriage === lynceusTriage);
        matches = matches && hasConsensus;
      }
      
      return matches;
    }),
  [processedFindings, severityFilter, searchQuery, aiFilter, isSelectionMode]);

  useEffect(() => {
    if (filteredFindings.length > 0 && !selectedFindingId) {
      setSelectedFindingId(filteredFindings[0]._uiId);
    }
  }, [filteredFindings, selectedFindingId]);

  const selectedFinding = useMemo(() => {
    const finding = processedFindings.find((f: any) => f._uiId === selectedFindingId);
    return finding;
  }, [processedFindings, selectedFindingId]);

  // Calculate Security Score
  const securityScore = useMemo(() => {
    const weights = { critical: 25, high: 10, medium: 5, low: 2, info: 0 };
    const findings = report?.result?.findings || [];
    const penalty = findings.reduce((acc: number, f: any) => acc + (weights[f.severity as keyof typeof weights] || 0), 0);
    return Math.max(0, 100 - penalty);
  }, [report]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Error loading report</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <Button variant="outline" asChild>
          <Link to="/sast">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!report) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#10b981"; // Emerald-500
    if (score >= 70) return "#f59e0b"; // Amber-500
    return "#ef4444"; // Red-500
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900 dark:text-orange-400";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900 dark:text-yellow-400";
      case "low": return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-400";
      default: return "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return <AlertOctagon className="h-4 w-4" />;
      case "high": return <AlertTriangle className="h-4 w-4" />;
      case "medium": return <ShieldAlert className="h-4 w-4" />;
      case "low": return <ShieldCheck className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSeverity = (sev: string) => {
    setSeverityFilter(prev => 
      prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]
    );
  };

  const scoreData = [
    { name: "Score", value: securityScore },
    { name: "Remaining", value: 100 - securityScore }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* A. Header Ejecutivo (Animado) */}
      <div className="flex-none border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between gap-6">
          {/* Izquierda: Título y Datos */}
          <div className="flex items-center gap-4 min-w-[300px]">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted" asChild>
              <Link to="/sast">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight text-foreground">
                  <Code2 className="h-5 w-5" />
                  {report.projectAlias || "Unknown Project"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono font-normal text-xs bg-muted/50 text-muted-foreground px-2.5 py-0.5">
                   {taskId?.substring(0, 8) || report.taskId?.substring(0, 8)}...
                </Badge>
                <Badge className={cn(
                  "ml-2 h-5 text-[10px]",
                  (report.status === 'failed' || report.status === 'error') ? "bg-red-100 text-red-700 hover:bg-red-100 border-red-200" :
                  "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                )}>{report.status || "Completed"}</Badge>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-xs text-muted-foreground">{report.createdAt ? new Date(report.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
             </div>
            </div>
        </div>

        {/* Custom Rules Button */}
        {report.result?.custom_rules && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCustomRulesOpen(true)}
            className="hidden md:flex items-center gap-2 border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Terminal className="h-4 w-4 text-purple-400" />
            <span className="font-mono text-xs">CUSTOM RULES LOG</span>
            {(report.result.custom_rules.failures || 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px] min-w-[16px] justify-center">
                {report.result.custom_rules.failures}
              </Badge>
            )}
          </Button>
        )}

          {/* Derecha: Resumen de Severidad y Métricas */}
          <div className="flex items-center gap-6">
             {/* Nuevas Métricas de Cobertura y Árbol */}
             <div className="hidden xl:flex items-center gap-3">
                <div className="flex flex-col items-end">
                   <span className="text-lg font-bold leading-none text-slate-700 dark:text-slate-300">
                      {report.result?.summary?.files_scanned_count || 0}
                   </span>
                   <span className="text-[9px] uppercase font-bold text-slate-400">Files Scanned</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col items-end">
                   <span className="text-lg font-bold leading-none text-slate-700 dark:text-slate-300">
                      {report.result?.summary?.rules_executed_count || 0}
                   </span>
                   <span className="text-[9px] uppercase font-bold text-slate-400">Rules Executed</span>
                </div>
                
                <Dialog>
                 <DialogTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-9 w-9 ml-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 shadow-sm" title="View Source Tree">
                      <FolderTree className="h-4 w-4" />
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                   <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-slate-700">
                       <FolderTree className="h-5 w-5 text-indigo-500" />
                       Affected Source Paths
                     </DialogTitle>
                     <p className="text-sm text-muted-foreground">Hierarchical view of files containing vulnerabilities.</p>
                   </DialogHeader>
                   <div className="flex-1 overflow-y-auto pr-2 mt-2 border rounded-md p-4 bg-slate-50/50">
                      {report.result?.findings && report.result.findings.length > 0 ? (
                        buildSourceTree(report.result.findings)
                          .sort((a, b) => b.findingsCount - a.findingsCount)
                          .map((node, i) => (
                           <FileTreeNode key={i} node={node} />
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-10">No findings to display in tree.</div>
                      )}
                   </div>
                 </DialogContent>
               </Dialog>
             </div>

             <div className="h-8 w-px bg-border hidden xl:block" />

            {/* Severity Cards */}
            <div className="flex gap-2">
            <div className={cn(
              "flex flex-col items-center justify-center p-2 rounded-lg border w-16 transition-all",
              "hover:scale-105 hover:shadow-sm cursor-default",
              "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-400"
            )}>
              <span className="text-lg font-bold leading-none">{report.result?.findings?.length || 0}</span>
              <span className="text-[10px] uppercase font-medium opacity-80 mt-1">Total</span>
            </div>
            {["critical", "high", "medium", "low", "info"].map((sev) => {
              const count = report.result?.summary?.severity?.[sev];
              // Show if count exists (even if 0, if present in data) or if we want to force show all.
              // Let's show if defined.
              if (count === undefined) return null;
              
              return (
                <div key={sev} className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border w-16 transition-all",
                  "hover:scale-105 hover:shadow-sm cursor-default",
                  getSeverityColor(sev)
                )}>
                  <span className="text-lg font-bold leading-none">{count}</span>
                  <span className="text-[10px] uppercase font-medium opacity-80 mt-1">{sev}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

      {/* C. Main Content - Master Detail Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Findings List */}
        <div className="w-1/3 min-w-[320px] max-w-[450px] border-r flex flex-col bg-muted/5">
          <div className="p-2 border-b bg-background/50 backdrop-blur-sm">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filter by rule, file or ID..." 
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="p-3 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FilterIcon className="h-3 w-3" />
              Showing {filteredFindings.length} findings
            </span>
             <Button
                variant={isSelectionMode ? "secondary" : "outline"}
                size="sm"
                className={cn("h-6 text-xs gap-1 ml-2", isSelectionMode && "bg-primary/10 text-primary hover:bg-primary/20")}
                onClick={() => {
                   setIsSelectionMode(!isSelectionMode);
                   if (isSelectionMode) setSelectedForDoubleCheck([]);
                }}
                disabled={isProcessingDoubleCheck}
             >
                <Check className="h-3 w-3" />
                {isSelectionMode ? "Cancel" : "Select"}
             </Button>
          </div>

          {/* Filters in Sidebar */}
          <div className="flex items-center justify-between p-2 px-3 border-b bg-muted/20 overflow-x-auto">
             <div className="flex items-center gap-1 pr-2">
                {["critical", "high", "medium", "low", "info"].map(sev => (
                  <button
                    key={sev}
                    onClick={() => toggleSeverity(sev)}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all ring-1 ring-transparent",
                      severityFilter.includes(sev) ? getSeverityColor(sev) : "bg-muted text-muted-foreground opacity-50 hover:opacity-100",
                      severityFilter.includes(sev) && "ring-offset-1 ring-offset-background ring-primary/20"
                    )}
                    title={`Toggle ${sev}`}
                  >
                    {getSeverityIcon(sev)}
                  </button>
                ))}
             </div>
             <div className="flex items-center gap-2 pl-2 border-l">
                {/* Lynceus Filter (LS) */}
                <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setAiFilter(aiFilter === 'lynceus' ? 'all' : 'lynceus')}>
                   <div className={cn(
                      "w-4 h-4 rounded flex items-center justify-center transition-all border shadow-sm",
                      aiFilter === 'lynceus' 
                         ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400" 
                         : "bg-background border-muted-foreground/30 text-muted-foreground group-hover:border-amber-300 group-hover:bg-amber-50"
                   )}>
                      {aiFilter === 'lynceus' ? <Check className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
                   </div>
                   <span className={cn(
                      "text-[10px] font-medium transition-colors",
                      aiFilter === 'lynceus' ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                   )}>LS</span>
                </div>

                {/* Sync Filter (Sync) */}
                <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setAiFilter(aiFilter === 'sync' ? 'all' : 'sync')}>
                   <div className={cn(
                      "w-4 h-4 rounded flex items-center justify-center transition-all border shadow-sm",
                      aiFilter === 'sync' 
                         ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400" 
                         : "bg-background border-muted-foreground/30 text-muted-foreground group-hover:border-green-300 group-hover:bg-green-50"
                   )}>
                      {aiFilter === 'sync' ? <Check className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
                   </div>
                   <span className={cn(
                      "text-[10px] font-medium transition-colors",
                      aiFilter === 'sync' ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                   )}>Sync</span>
                </div>
             </div>
          </div>

          {isSelectionMode && selectedForDoubleCheck.length > 0 && (
             <div className="p-2 border-b bg-primary/5 flex items-center justify-between animate-in slide-in-from-top-2 gap-2">
                <span className="text-xs font-medium text-primary ml-2 whitespace-nowrap">{selectedForDoubleCheck.length} selected</span>
                <div className="flex items-center gap-2">
                  <Select value={selectedModelType} onValueChange={setSelectedModelType} disabled={isProcessingDoubleCheck}>
                    <SelectTrigger className="h-7 w-[100px] text-xs">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                     size="sm" 
                     className="h-7 text-xs gap-2 min-w-[90px]"
                     onClick={handleRunDoubleCheck}
                     disabled={isProcessingDoubleCheck}
                  >
                     {isProcessingDoubleCheck ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Analyzing ...
                        </>
                     ) : (
                        <>
                          <Brain className="h-3 w-3" />
                          Verify
                        </>
                     )}
                  </Button>
                </div>
             </div>
          )}
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredFindings.map((finding: any, index: number) => (
                <div
                  key={finding._uiId}
                  onClick={() => setSelectedFindingId(finding._uiId)}
                  className={cn(
                    "group flex flex-col gap-2 rounded-lg border p-3 text-left text-sm transition-all cursor-pointer",
                    "hover:shadow-md animate-in fade-in slide-in-from-left-4 duration-300",
                    "border-l-4", 
                    selectedFindingId === finding._uiId 
                      ? "bg-background border-primary/50 shadow-sm ring-1 ring-primary/20" 
                      : "bg-card hover:bg-accent/50 border-t-transparent border-r-transparent border-b-transparent hover:border-t-border hover:border-r-border hover:border-b-border"
                  )}
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    borderLeftColor: selectedFindingId === finding._uiId ? undefined : getScoreColor(finding.severity === 'critical' ? 0 : finding.severity === 'high' ? 30 : 80)
                  }} 
                >
                  <div className="flex items-start gap-3">
                    {isSelectionMode && (
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedForDoubleCheck.includes(finding.id)}
                            onCheckedChange={() => toggleDoubleCheck(finding.id)}
                            id={`check-${finding._uiId}`}
                          />
                        </div>
                    )}
                    
                    <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                      <div className={cn("p-1.5 rounded-md transition-colors", getSeverityColor(finding.severity))}>
                        {getSeverityIcon(finding.severity)}
                      </div>
                      
                      {/* Brain Icons Logic */}
                      {(() => {
                        const hasDoubleCheck = !!finding.analysis_json?.double_check;
                        const argusTriage = finding.analysis_json?.triage;
                        const lynceusTriage = hasDoubleCheck ? finding.analysis_json?.double_check?.triage : null;
                        const hasConsensus = hasDoubleCheck && (argusTriage === lynceusTriage);

                        if (hasConsensus) {
                          return (
                            <div className="p-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" title={`Consensus: ${argusTriage}`}>
                              <Brain className="h-3 w-3" />
                            </div>
                          );
                        }

                        return (
                          <>
                            <div className="p-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" title={`Argus: ${argusTriage}`}>
                              <Brain className="h-3 w-3" />
                            </div>
                            {hasDoubleCheck && (
                              <div className="p-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" title={`Lynceus: ${lynceusTriage}`}>
                                <Brain className="h-3 w-3" />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("font-semibold leading-tight", selectedFindingId === finding._uiId ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                          {finding.rule_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <FileCode className="h-3 w-3" />
                        <span className="truncate">{finding.file_path}</span>
                        <span className="text-muted-foreground/50">:</span>
                        <span className={cn(selectedFindingId === finding._uiId ? "text-primary" : "")}>{finding.line}</span>
                      </div>
                    </div>
                    {selectedFindingId === finding._uiId && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground animate-in slide-in-from-left-2" />
                    )}
                  </div>
                </div>
              ))}
              {filteredFindings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No findings match your filters.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content - Finding Detail */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
          {selectedFinding ? (
            <ScrollArea className="flex-1 w-full h-full">
              <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 key={selectedFinding.id}">
                {/* 1. Header Section */}
                <div className="flex flex-col space-y-4 mb-6">
                  {/* Line 1: Platform Badge (Right aligned) */}
                  <div className="flex items-center justify-end">
                    <div className="inline-flex items-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-1.5 px-3 py-1.5 text-sm font-semibold bg-slate-900 text-slate-50 border-slate-800">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Aegis
                    </div>
                  </div>

                  {/* Line 2: Severity + File Path (Left aligned) */}
                  <div className="flex items-center gap-3">
                    <Badge className={cn("capitalize px-3 py-1.5 text-sm font-medium shadow-sm", getSeverityColor(selectedFinding.severity))}>
                      <span className="flex items-center gap-1.5">
                        {getSeverityIcon(selectedFinding.severity)}
                        {selectedFinding.severity}
                      </span>
                    </Badge>

                    {/* File Path Badge - Dark Purple Theme */}
                    <div className="flex items-center gap-2 text-sm font-mono bg-[#1e1b4b] text-purple-200 border border-purple-800/60 p-1.5 px-3 rounded-lg shadow-sm">
                      <Terminal className="h-3.5 w-3.5 text-purple-400" />
                      <span className="font-medium break-all">{selectedFinding.file_path}</span>
                      <span className="text-purple-500/50">:</span>
                      <span className="text-purple-300 font-bold">{selectedFinding.line}</span>
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
                    {selectedFinding.rule_name}
                  </h2>
                  
                  {/* CWE Badge - Styled exactly like File Path Badge */}
                  <div className="flex gap-2">
                    {selectedFinding.cwe && (
                       <div className="flex items-center gap-2 text-sm font-mono bg-[#1e1b4b] text-purple-200 border border-purple-800/60 p-1.5 px-3 rounded-lg shadow-sm w-fit">
                          <span className="font-medium">{selectedFinding.cwe}</span>
                       </div>
                    )}
                    {/* CVE Badge - Added per user inquiry about visibility */}
                    {selectedFinding.cve && (
                       <div className="flex items-center gap-2 text-sm font-mono bg-[#1e1b4b] text-purple-200 border border-purple-800/60 p-1.5 px-3 rounded-lg shadow-sm w-fit">
                          <span className="font-medium">{selectedFinding.cve}</span>
                       </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* 2. Analysis Comparison (Argus Eye vs Argus Deep Mind) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Left Card: Argus Eye (Standard Analysis) */}
                   <Card className="flex flex-col h-full border-l-4 border-l-blue-500 shadow-sm overflow-hidden">
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 border-b flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                               <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                               <h3 className="font-bold text-base text-foreground">Argus Eye</h3>
                               <p className="text-xs text-muted-foreground">Specialized Finetuned Security Model</p>
                            </div>
                         </div>
                         <Badge variant="outline" className={cn(
                            "text-xs",
                            selectedFinding.analysis_json.triage === "True Positive" ? "bg-red-50 text-red-700 border-red-200" :
                            selectedFinding.analysis_json.triage === "False Positive" ? "bg-green-50 text-green-700 border-green-200" :
                            "bg-yellow-50 text-yellow-700 border-yellow-200"
                         )}>
                            {selectedFinding.analysis_json.triage}
                         </Badge>
                      </div>
                      <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                         <div className="prose prose-sm dark:prose-invert max-w-none h-[20rem] overflow-y-auto pr-2">
                            <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-1">Analysis</h4>
                            <div className="text-sm text-foreground/90">
                               <ReactMarkdown components={{ li: ({node, ...props}) => <li className="text-white" {...props} /> }}>
                                 {selectedFinding.analysis_json.reasoning}
                               </ReactMarkdown>
                            </div>
                         </div>
                         <div className="bg-muted/30 p-3 rounded-md border text-sm flex-1 flex flex-col">
                            <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                               <Lightbulb className="h-3 w-3" /> Recommendation
                            </h4>
                            <ExpandableContent content={selectedFinding.analysis_json.recommendation} />
                         </div>
                      </CardContent>
                   </Card>

                   {/* Right Card: Lynceus Sight (Double Check) - Only if available */}
                   {selectedFinding.analysis_json.double_check ? (
                      <Card className="flex flex-col h-full border-l-4 border-l-amber-500 shadow-md overflow-hidden ring-1 ring-amber-500/20 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
                         <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                                  <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                               </div>
                               <div>
                               <h3 className="font-bold text-base text-foreground">Lynceus Sight</h3>
                               <p className="text-xs text-muted-foreground">Powered by Frontier AI Models</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50 uppercase">
                              {selectedFinding.analysis_json.double_check_model || selectedFinding.analysis_json.double_check.model || "AI Model"}
                            </Badge>
                            <Badge variant="outline" className={cn(
                                  "text-xs font-bold",
                                  selectedFinding.analysis_json.double_check.triage === "True Positive" ? "bg-red-50 text-red-700 border-red-200" :
                                  selectedFinding.analysis_json.double_check.triage === "False Positive" ? "bg-green-50 text-green-700 border-green-200" :
                                  "bg-yellow-50 text-yellow-700 border-yellow-200"
                               )}>
                                  {selectedFinding.analysis_json.double_check.triage}
                               </Badge>
                            </div>
                         </div>
                         <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                            <div className="prose prose-sm dark:prose-invert max-w-none h-[20rem] overflow-y-auto pr-2">
                               <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-1">Analysis</h4>
                               <div className="text-sm text-foreground leading-relaxed">
                                  <ReactMarkdown components={{ li: ({node, ...props}) => <li className="text-white" {...props} /> }}>
                                    {selectedFinding.analysis_json?.double_check?.reasoning}
                                  </ReactMarkdown>
                               </div>
                            </div>
                            
                            {selectedFinding.analysis_json?.double_check?.recommendation && (
                               <div className="bg-amber-50/50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-100 dark:border-amber-900/50 text-sm flex-1 flex flex-col">
                                  <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                     <Lightbulb className="h-3 w-3 text-foreground" /> Recommendation
                                  </h4>
                                  <div className="text-foreground flex-1">
                                     <ExpandableContent content={selectedFinding.analysis_json?.double_check?.recommendation} />
                                  </div>
                               </div>
                            )}
                         </CardContent>
                      </Card>
                   ) : (
                      /* Placeholder for Argus Deep Mind */
                      modelSelectionId === selectedFinding.id ? (
                        <div className="h-full rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center p-6 text-center gap-4 animation-in fade-in zoom-in-95 duration-200">
                           <div className="w-full max-w-xs space-y-3">
                               <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-foreground text-sm">Select Verification Model</h3>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setModelSelectionId(null)}>
                                     <span className="sr-only">Close</span>
                                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                  </Button>
                               </div>
                               <div className="grid gap-2 text-left">
                                  {['standard', 'pro', 'max'].map((model) => (
                                      <div 
                                        key={model}
                                        className={cn(
                                           "flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all hover:bg-background/80",
                                           selectedModelType === model ? "border-primary bg-background ring-1 ring-primary/20 shadow-sm" : "border-border bg-background/40"
                                        )}
                                        onClick={() => setSelectedModelType(model)}
                                      >
                                         <div className="flex flex-col">
                                            <span className="font-medium capitalize text-sm">{model}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                               {model === 'standard' ? 'Fastest • 1 Credit' : model === 'pro' ? 'Balanced • 2 Credits' : 'Deepest • 3 Credits'}
                                            </span>
                                         </div>
                                         <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", selectedModelType === model ? "border-primary" : "border-muted-foreground/30")}>
                                            {selectedModelType === model && <div className="h-2 w-2 rounded-full bg-primary" />}
                                         </div>
                                      </div>
                                  ))}
                               </div>
                               <Button 
                                  size="sm" 
                                  className="w-full gap-2 mt-2"
                                  onClick={() => handleRunDoubleCheckWithModel(selectedFinding.id, selectedModelType)}
                                  disabled={isProcessingDoubleCheck}
                                >
                                   {isProcessingDoubleCheck ? (
                                     <>
                                       <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                                       Analyzing...
                                     </>
                                   ) : (
                                     <>
                                       <Brain className="w-3 h-3" />
                                       Run Analysis
                                     </>
                                   )}
                                </Button>
                           </div>
                        </div>
                      ) : (
                      <div className="h-full rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 flex flex-col items-center justify-center p-6 text-center gap-4">
                         <div className="p-4 bg-muted/20 rounded-full">
                            <Brain className="h-8 w-8 text-muted-foreground/40" />
                         </div>
                         <div className="space-y-1">
                            <h3 className="font-semibold text-muted-foreground">Lynceus Sight Inactive</h3>
                            <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">
                               Select this finding and click "Invoke Lynceus Sight" to activate advanced verification logic.
                            </p>
                         </div>
                         <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                                setModelSelectionId(selectedFinding.id);
                                setSelectedModelType("standard");
                            }}
                            disabled={selectedForDoubleCheck.includes(selectedFinding.id)}
                         >
                            {selectedForDoubleCheck.includes(selectedFinding.id) ? "Selected for Scan" : "Invoke Lynceus Sight"}
                         </Button>
                      </div>
                      )
                   )}
                </div>

                {/* 3. Evidencia de Código (Code Snippet) */}
                {selectedFinding.code_snippet && (() => {
                  const cleanSnippet = selectedFinding.code_snippet?.replace(/\n$/, '') || '';
                  const snippetLines = cleanSnippet.split('\n');

                  // Heuristic: If snippet has > 6 lines, assume it's the enhanced context (start at line - 5)
                  // Otherwise, assume it's standard Semgrep output (starts at line)
                  const isEnhanced = snippetLines.length > 6;
                  const startLine = isEnhanced ? Math.max(1, selectedFinding.line - 5) : selectedFinding.line;
                  const endLine = startLine + snippetLines.length - 1;

                  return (
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <Code2 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <h3 className="font-semibold text-lg text-foreground">Code Evidence</h3>
                      </div>
                      <div className="relative rounded-lg overflow-hidden border shadow-sm">
                        <div className="absolute top-3 right-3 z-10">
                           <Badge variant="outline" className="bg-background/80 backdrop-blur text-xs font-mono">
                             Lines {startLine}-{endLine}
                           </Badge>
                        </div>
                        <SyntaxHighlighter 
                          language={getLanguageFromPath(selectedFinding.file_path)}
                          style={vscDarkPlus} 
                          customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}
                          showLineNumbers={true}
                          lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "#6c7280", textAlign: "right" }}
                          startingLineNumber={startLine}
                          wrapLines={true}
                          lineProps={(lineNumber) => {
                            const isTargetLine = lineNumber === Number(selectedFinding.line);
                            const style: React.CSSProperties = { display: "block", width: "100%" };
                            if (isTargetLine) {
                              style.backgroundColor = "rgba(239, 68, 68, 0.2)"; // Red-500 with opacity
                              style.borderLeft = "4px solid #ef4444"; // Red-500
                              style.fontWeight = "bold";
                            } else {
                              style.borderLeft = "4px solid transparent"; // Maintain alignment
                            }
                            return { style };
                          }}
                        >
                          {cleanSnippet}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Shield Up Section (Formerly Remediation) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Shield Up</h3>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative bg-[#1e1e1e] text-slate-50 rounded-lg shadow-xl overflow-hidden border border-slate-800">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3e3e42]">
                        <span className="text-xs text-slate-400 font-mono flex items-center gap-2">
                          <Terminal className="h-3 w-3 text-white" />
                          Suggested Fix
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs gap-1.5 text-slate-300 hover:text-white hover:bg-[#3e3e42]"
                          onClick={() => copyToClipboard(selectedFinding.analysis_json.recommendation)}
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? "Copied" : "Copy Code"}
                        </Button>
                      </div>
                      <div className="p-0">
                         {/* Remediation text removed as redundant. Only showing Code/ASCII. */}
                         <div className="prose prose-invert max-w-none p-4 text-sm text-emerald-100/90 leading-relaxed">
                            <pre className="mt-0 text-emerald-500/50 font-mono text-xs bg-black/20 p-4 rounded border border-emerald-900/20 select-none">
{`#####################################################
#                                                   #
#  [COMING SOON] AUTOMATED SNIPPET FIX              #
#  POWERED BY COSMIC AI LAYER                       #
#  >> INITIATING NEURAL PATCHING SEQUENCE...        #
#                                                   #
#####################################################`}
                            </pre>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Double Check Analysis (Removed as redundant) */}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 animate-in fade-in duration-500">
              <div className="p-6 rounded-full bg-muted/20 mb-4">
                <SearchIcon className="h-12 w-12 opacity-50" />
              </div>
              <p className="text-lg font-medium">Select a finding to view details</p>
              <p className="text-sm opacity-70">Review vulnerability analysis and remediation steps</p>
            </div>
          )}
        </div>
      </div>

      <ScanReportDialog 
        taskId={taskId || null} 
        open={customRulesOpen} 
        onOpenChange={setCustomRulesOpen} 
      />
    </div>
  );
}
