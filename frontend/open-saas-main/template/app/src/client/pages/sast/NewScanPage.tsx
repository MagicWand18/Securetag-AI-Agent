
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { type AuthUser } from "wasp/auth";
import { useAction, createScan, getProjects, useQuery } from "wasp/client/operations";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";
import { Upload, ArrowLeft, Loader2, Zap, Brain, Coins, Shield, FileCode, CheckCircle2, Cpu, Terminal as TerminalIcon, Search } from "lucide-react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { cn } from "../../utils";
import GridScan from "../../components/react-bits/GridScan/GridScan";
import { calculateScanCost, SAST_COSTS } from "../../../shared/sastCosts";

// --- Components ---

const RollingNumber = ({ value }: { value: number }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => current.toFixed(1));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
};

const UplinkTerminal = () => {
  const [lines, setLines] = useState<string[]>([]);
  const logs = [
    "> Initializing secure uplink...",
    "> Verifying integrity...",
    "> Handshaking with core...",
    "> Encrypting payload (AES-256)...",
    "> Packet transfer started...",
    "> Uploading 100%...",
    "> Awaiting server confirmation..."
  ];

  useEffect(() => {
    let delay = 0;
    logs.forEach((log, index) => {
      delay += Math.random() * 800 + 200;
      setTimeout(() => {
        setLines(prev => [...prev, log]);
      }, delay);
    });
  }, []);

  return (
    <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center font-mono text-blue-500 p-8">
      <div className="w-full max-w-md space-y-2">
        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
           <motion.div 
             className="h-full bg-blue-500"
             initial={{ width: "0%" }}
             animate={{ width: "100%" }}
             transition={{ duration: 4, ease: "easeInOut" }}
           />
        </div>
        {lines.map((line, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm"
          >
            {line}
          </motion.div>
        ))}
        <motion.div 
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="h-4 w-2 bg-blue-500 inline-block ml-1"
        />
      </div>
    </div>
  );
};

export default function NewScanPage({ user }: { user: AuthUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  // const queryClient = useQueryClient();
  const preSelectedProject = new URLSearchParams(location.search).get("project");
  const createScanFn = useAction(createScan);
  
  // Projects Query
  const { data: projectsData } = useQuery(getProjects);
  const projects = projectsData?.projects || [];

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Project Selection State
  const [scanMode, setScanMode] = useState<'new' | 'existing'>('new');
  const [projectName, setProjectName] = useState(""); // For new project
  const [selectedProjectAlias, setSelectedProjectAlias] = useState(""); // For existing project
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  
  const [customRulesEnabled, setCustomRulesEnabled] = useState(false);
  const [customRulesQty, setCustomRulesQty] = useState("3");
  const [customRulesModel, setCustomRulesModel] = useState("standard");

  // Regex for project name validation
  const projectNameRegex = /^[a-zA-Z0-9_-]+$/;
  const isProjectNameValid = scanMode === 'new' ? projectNameRegex.test(projectName) : true;

  // Auto-select project from URL
  useEffect(() => {
    // Support both 'project' and 'projectId' params
    const projectIdParam = preSelectedProject || new URLSearchParams(location.search).get('projectId');
    
    if (projectIdParam && projects.length > 0) {
        // Find project by ID or Alias
        const project = projects.find((p: any) => p.id === projectIdParam || p.alias === projectIdParam);
        if (project) {
            setScanMode('existing');
            setSelectedProjectAlias(project.alias);
            setProjectSearchQuery(project.name);
        }
    }
  }, [preSelectedProject, location.search, projects]);

  const filteredProjects = projects.filter((p: any) => 
    (p.name || "").toLowerCase().includes(projectSearchQuery.toLowerCase()) || 
    (p.alias && (p.alias || "").toLowerCase().includes(projectSearchQuery.toLowerCase()))
  );

  // Helper for File Size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Real-time Cost Estimation
  const [costEstimation, setCostEstimation] = useState<{ total: number; breakdown: any }>({ 
    total: SAST_COSTS.BASE_SCAN, 
    breakdown: { base: SAST_COSTS.BASE_SCAN } 
  });

  const isProjectSelectionValid = scanMode === 'new' ? isProjectNameValid : !!selectedProjectAlias;

  useEffect(() => {
    const estimation = calculateScanCost({
      customRules: customRulesEnabled,
      customRulesQty: customRulesEnabled ? parseInt(customRulesQty) : 0,
      customRulesModel: customRulesEnabled ? customRulesModel : undefined,
    });
    setCostEstimation(estimation);
  }, [customRulesEnabled, customRulesQty, customRulesModel]);

  const hasInsufficientCredits = (user.credits || 0) < costEstimation.total;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Drag & Drop Handlers

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        if (e.dataTransfer.files[0].name.endsWith('.zip')) {
            setSelectedFile(e.dataTransfer.files[0]);
        } else {
            alert("Only .zip files are allowed for security analysis.");
        }
    }
  };

  const handleScanStart = async () => {
    if (!selectedFile) return;
    
    let finalProjectName = "";

    if (scanMode === 'new') {
        if (!projectName || projectName.trim().length === 0) {
            alert("Please enter a valid Project Name to proceed.");
            return;
        }
        if (!isProjectNameValid) {
            alert("Project name contains invalid characters. Use only letters, numbers, underscores, and dashes.");
            return;
        }
        finalProjectName = projectName;
    } else {
        if (!selectedProjectAlias) {
            alert("Please select an existing project.");
            return;
        }
        finalProjectName = selectedProjectAlias;
    }
    
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      reader.onload = async () => {
        try {
          const base64Content = (reader.result as string).split(',')[1];
          
          const result = await createScanFn({
            projectName: finalProjectName,
            fileName: selectedFile.name,
            fileContent: base64Content,
            profile: 'auto',
            customRules: customRulesEnabled,
            customRulesQty: customRulesEnabled ? customRulesQty : undefined,
            customRulesModel: customRulesEnabled ? customRulesModel : undefined
          });
          
          // Small delay to show the terminal animation
          setTimeout(async () => {
             // Invalidate queries to ensure fresh data in history page
             // await queryClient.invalidateQueries({ queryKey: ['operations/getProjectHistory'] });
             // await queryClient.invalidateQueries({ queryKey: ['operations/getProjects'] });

             // Redirect to Project History using the ALIAS/NAME
             // If result has alias, use it. Otherwise use the input name.
             const targetId = result.alias || result.project_alias || finalProjectName;
             navigate(`/sast/projects/${targetId}`);
          }, 4500);
          
        } catch (error: any) {
          console.error("Scan creation failed:", error);
          alert(`Failed to create scan: ${error.message}`);
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        alert("Failed to read file");
        setIsUploading(false);
      };
      
    } catch (error) {
      console.error("Error starting scan:", error);
      setIsUploading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-200 p-6 font-sans relative overflow-hidden">
      {/* Uplink Overlay */}
      <AnimatePresence>
        {isUploading && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
            >
                <UplinkTerminal />
            </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="container mx-auto max-w-5xl relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-end">
          <div>
              <Link
                to="/sast"
                className="text-xs font-mono text-blue-500 hover:text-blue-400 flex items-center gap-1 mb-2 uppercase tracking-widest transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Abort Mission
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-500" />
                INITIALIZE ANALYSIS
              </h1>
              <p className="text-white mt-1 font-mono text-sm flex items-center gap-2">
                <span className="text-blue-500">//</span> UPLOAD SOURCE CODE FOR DEEP INSPECTION
              </p>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main Form Area */}
          <motion.div variants={itemVariants} className="space-y-6">
            
            {/* Holographic Drop Zone */}
            <div className="relative group">
                <div 
                    className={cn(
                        "absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500",
                        isDragging ? "opacity-100 blur-md from-green-500 to-emerald-500" : ""
                    )}
                ></div>
                <Card className={cn(
                    "relative bg-black border-slate-800 overflow-hidden transition-all duration-300",
                    isDragging ? "border-green-500 bg-black/90" : ""
                )}>
                  {/* Grid Background */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    <GridScan
                      gridScale={0.02}
                      linesColor="#1e293b"
                      scanColor="#3b82f6"
                      scanOpacity={0.4}
                      scanDuration={3}
                      enablePost={true}
                      bloomIntensity={0.6}
                      className="w-full h-full"
                    />
                  </div>
                  
                  <CardContent className="p-0 relative z-10">
                    <div 
                        className="p-12 flex flex-col items-center justify-center text-center cursor-pointer min-h-[300px]"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        accept=".zip"
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />
                      
                      <div className="relative z-10">
                          {selectedFile ? (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center"
                              >
                                  <div className="bg-blue-500/20 p-4 rounded-full mb-4 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                      <FileCode className="h-10 w-10 text-blue-400" />
                                  </div>
                                  <h3 className="text-xl font-bold text-white mb-1">{selectedFile.name}</h3>
                                  <p className="text-sm font-mono text-blue-400 mb-4">{formatBytes(selectedFile.size)} LOCKED</p>
                                  <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 text-slate-300">
                                      Change Payload
                                  </Button>
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center transition-transform duration-300 group-hover:scale-105">
                                  <div className={cn(
                                      "bg-slate-800 p-4 rounded-full mb-4 border border-slate-700 transition-colors duration-300",
                                      isDragging ? "bg-green-500/20 border-green-500 text-green-400 scale-110" : "text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/50"
                                  )}>
                                      <Upload className="h-10 w-10" />
                                  </div>
                                  <h3 className={cn(
                                    "text-lg font-medium mb-1 transition-colors",
                                    isDragging ? "text-green-400 font-bold tracking-widest" : "text-slate-200"
                                  )}>
                                      {isDragging ? "TARGET LOCKED" : "INITIATE UPLOAD SEQUENCE"}
                                  </h3>
                                  <p className={cn(
                                    "text-sm max-w-xs transition-colors",
                                    isDragging ? "text-green-500/80" : "text-slate-500"
                                  )}>
                                      {isDragging ? "Release to engage data transfer protocol" : "Drag & drop your source code (ZIP) here or click to browse filesystem."}
                                  </p>
                              </div>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
            </div>

            {/* Mission Parameters */}
            <motion.div variants={itemVariants} className="space-y-6">
                
                {/* Unified Configuration Module */}
                <Card className="bg-white dark:bg-black border-slate-200 dark:border-slate-800 relative overflow-visible group hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-600 to-purple-600"></div>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <Cpu className="h-4 w-4" /> Scan Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Project Selection Section */}
                        <div className="space-y-4">
                            {/* Project Selection Mode */}
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                                <button
                                    onClick={() => setScanMode('new')}
                                    className={cn(
                                        "flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all duration-200",
                                        scanMode === 'new' 
                                            ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    New Project
                                </button>
                                <button
                                    onClick={() => setScanMode('existing')}
                                    className={cn(
                                        "flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all duration-200",
                                        scanMode === 'existing' 
                                            ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    Existing Project
                                </button>
                            </div>

                            {scanMode === 'new' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="project-name" className="text-xs uppercase font-mono text-black dark:text-white">Target Identifier (Required)</Label>
                                    <Input 
                                        id="project-name" 
                                        placeholder="e.g., CORE-SYSTEM-ALPHA" 
                                        className={cn(
                                            "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-sm focus-visible:ring-blue-500/50 text-black dark:text-white",
                                            !isProjectNameValid && projectName.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""
                                        )}
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        required
                                    />
                                    {!isProjectNameValid && projectName.length > 0 && (
                                        <p className="text-[10px] text-red-500 font-mono mt-1">* INVALID CHARACTERS: USE LETTERS, NUMBERS, - OR _</p>
                                    )}
                                    {!projectName && (
                                        <p className="text-[10px] text-red-500 font-mono mt-1">* PROJECT NAME IS REQUIRED FOR INITIALIZATION</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2 relative">
                                    <Label className="text-xs uppercase font-mono text-black dark:text-white">Select Target (Required)</Label>
                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                            <Input
                                                placeholder="Search existing projects..."
                                                className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-sm text-black dark:text-white"
                                                value={projectSearchQuery}
                                                onChange={(e) => {
                                                    setProjectSearchQuery(e.target.value);
                                                    setIsDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                            />
                                        </div>
                                        {isDropdownOpen && (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg z-50 overflow-hidden flex flex-col">
                                                <div className="overflow-y-auto max-h-[200px] p-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                                    {filteredProjects.length > 0 ? (
                                                        filteredProjects.map((project: any) => (
                                                            <div
                                                                key={project.id}
                                                                className="px-3 py-2 text-sm font-mono cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm flex items-center gap-2 text-black dark:text-white"
                                                                onClick={() => {
                                                                    setSelectedProjectAlias(project.alias);
                                                                    setProjectSearchQuery(project.name);
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                            >
                                                                <span className="flex-1 truncate">{project.name}</span>
                                                                {project.alias === selectedProjectAlias && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-xs text-muted-foreground font-mono">No projects found.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Click outside listener could be added here or simplified by just closing on selection */}
                                    {isDropdownOpen && (
                                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsDropdownOpen(false)} />
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="scan-profile" className="text-xs uppercase font-mono text-black dark:text-white">Scan Profile</Label>
                                <div className="relative">
                                    <Input 
                                        id="scan-profile" 
                                        value="AUTO_DETECT_STACK" 
                                        disabled 
                                        className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-black dark:text-white font-mono text-sm pl-9" 
                                    />
                                    <div className="absolute left-3 top-2.5 h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-200 dark:bg-slate-800" />

                        {/* AI Neural Config Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-widest">AI Neural Config</span>
                            </div>

                            {/* Custom Rules Switch */}
                            <div className={cn(
                                "flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
                                customRulesEnabled ? "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/50 shadow-[0_0_10px_rgba(147,51,234,0.1)]" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            )}>
                                <div className="space-y-0.5">
                                    <Label className={cn("text-sm font-medium transition-colors", customRulesEnabled ? "text-purple-700 dark:text-purple-300" : "text-black dark:text-white")}>Generative Rules</Label>
                                    <p className="text-xs text-black dark:text-white">Context-aware rule synthesis</p>
                                </div>
                                <Switch 
                                    checked={customRulesEnabled}
                                    onCheckedChange={setCustomRulesEnabled}
                                    className="data-[state=checked]:bg-purple-600 data-[state=checked]:shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                                />
                            </div>

                            {/* Expanded Configs (Conditional) */}
                            <AnimatePresence>
                                {(customRulesEnabled) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
                                            {customRulesEnabled && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase font-mono text-slate-600 dark:text-slate-500">Quantity (1-10)</Label>
                                                        <Input 
                                                            type="number" 
                                                            min={1} 
                                                            max={10} 
                                                            value={customRulesQty} 
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                if (!isNaN(val)) {
                                                                    if (val < 1) setCustomRulesQty("1");
                                                                    else if (val > 10) setCustomRulesQty("10");
                                                                    else setCustomRulesQty(e.target.value);
                                                                } else {
                                                                    setCustomRulesQty("");
                                                                }
                                                            }}
                                                            className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500/50 text-black dark:text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase font-mono text-slate-600 dark:text-slate-500">Model</Label>
                                                        <Select value={customRulesModel} onValueChange={setCustomRulesModel}>
                                                            <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-black dark:text-white"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-black dark:text-slate-200">
                                                                <SelectItem value="standard">Standard</SelectItem>
                                                                <SelectItem value="pro">Pro</SelectItem>
                                                                <SelectItem value="max">Max</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

          </motion.div>

          {/* Resource Monitor Sidebar */}
          <motion.div variants={itemVariants} className="space-y-6">
            <Card className="bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-xl sticky top-6">
              <CardHeader className="pb-2 border-b border-slate-200 dark:border-slate-900">
                <CardTitle className="text-sm font-mono text-black dark:text-white uppercase tracking-widest flex items-center justify-between">
                  <span>Resource Monitor</span>
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-800"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-800"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {/* Cost Breakdown */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-900 pb-2">
                    <span className="text-xs uppercase font-mono text-black dark:text-white">Base Scan</span>
                    <span className="text-xl font-bold font-mono text-black dark:text-white">{SAST_COSTS.BASE_SCAN} CR</span>
                  </div>



                  {customRulesEnabled && costEstimation.breakdown.customRules && (
                    <div className="space-y-1 border-b border-slate-200 dark:border-slate-900 pb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase font-mono text-purple-600 dark:text-purple-400">Gen. Rules</span>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 dark:bg-slate-900 px-1 rounded">{customRulesModel.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] text-slate-500">Processing Fee</span>
                        <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-300">+{costEstimation.breakdown.customRules.processing} CR</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] text-slate-500">Potential Success Fee</span>
                        <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-300">+{costEstimation.breakdown.customRules.potentialSuccess} CR</span>
                      </div>
                    </div>
                  )}

                  {/* Total & Balance */}
                  <div className="pt-2 flex justify-between items-end border-t-2 border-slate-200 dark:border-slate-800 mt-4">
                     <span className="text-sm font-bold uppercase text-black dark:text-white">Total Required</span>
                     <span className={cn("text-2xl font-bold font-mono", hasInsufficientCredits ? "text-red-500" : "text-blue-500")}>
                        {costEstimation.total} CR
                     </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-500">Your Balance:</span>
                     <span className={cn("font-mono font-bold", hasInsufficientCredits ? "text-red-500" : "text-green-500")}>
                        {user.credits || 0} CR
                     </span>
                  </div>

                  {hasInsufficientCredits && (
                      <div className="bg-red-500/10 border border-red-500/50 rounded p-2 text-[10px] text-red-500 text-center font-mono animate-pulse">
                          INSUFFICIENT CREDITS. <Link to="/settings/billing" className="underline font-bold">RELOAD NOW</Link>
                      </div>
                  )}
                  
                  <div className="pt-2">
                    <p className="text-[10px] text-black dark:text-white italic leading-relaxed">
                      * Final cost depends on actual findings. Credits are reserved (Worst-Case) and refunded if unused.
                    </p>
                  </div>
                </div>

                <Button 
                    onClick={handleScanStart} 
                    disabled={!selectedFile || !isProjectSelectionValid || isUploading || hasInsufficientCredits} 
                    className={cn(
                        "w-full h-14 text-lg font-bold tracking-wider uppercase transition-all duration-300 relative overflow-hidden group",
                        (!selectedFile || !isProjectSelectionValid || hasInsufficientCredits) ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-95"
                    )}
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> 
                        <span className="animate-pulse">INITIALIZING...</span>
                    </div>
                  ) : (
                    <>
                        <span className="relative z-10 flex items-center gap-2">
                           {hasInsufficientCredits ? (
                               <Coins className="h-5 w-5" />
                           ) : (
                               <Zap className={cn("h-5 w-5", selectedFile ? "text-fuchsia-500" : "")} /> 
                           )}
                           {hasInsufficientCredits ? "INSUFFICIENT FUNDS" : "START OPERATION"}
                        </span>
                        {/* Hover Effect */}
                        {!hasInsufficientCredits && (
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        )}
                    </>
                  )}
                </Button>

                <div className="text-[10px] text-black dark:text-white text-center font-mono">
                    SECURE TRANSMISSION ENCRYPTED via TLS 1.3
                </div>

              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
