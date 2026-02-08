import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { type AuthUser } from "wasp/auth";
import { useQuery, getProjects } from "wasp/client/operations";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Search,
  Plus,
  GitBranch,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  Lock,
  Terminal,
  Activity,
  Cpu
} from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";

export default function SastProjectsPage({ user: _user }: { user: AuthUser }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: projectsData, isLoading, error } = useQuery(getProjects);
  // Toggle showEmptyState = true to validate the "No Projects" view
  const projects = projectsData?.projects || [];
  const missingKey = projectsData?.missingKey;

  // Debug logs
  if (projects.length > 0) {
    console.log("Projects loaded:", projects);
    const unnamed = projects.filter((p: any) => !p.name);
    console.log("Unnamed projects:", unnamed);
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const filteredProjects = projects.filter((project: any) => {
    // Show projects with no name or empty name if they match other criteria or just list them if no search term
    const rawName = project.name;
    const hasName = rawName && rawName.trim().length > 0;
    const projectName = hasName ? rawName : "Unnamed Project";
    const projectAlias = project.alias || "";
    
    // Search Filter
    const matchesSearch = !searchTerm || (
      projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectAlias.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Date Filter
    let matchesDate = true;
    if (startDate || endDate) {
        const projectDate = new Date(project.created_at);
        // Normalize dates to ignore time components for comparison
        projectDate.setHours(0, 0, 0, 0);

        if (startDate) {
            const [sy, sm, sd] = startDate.split('-').map(Number);
            const start = new Date(sy, sm - 1, sd);
            matchesDate = matchesDate && projectDate.getTime() >= start.getTime();
        }
        if (endDate) {
            const [ey, em, ed] = endDate.split('-').map(Number);
            const end = new Date(ey, em - 1, ed);
            matchesDate = matchesDate && projectDate.getTime() <= end.getTime();
        }
    }

    return matchesSearch && matchesDate;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

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

  if (missingKey) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative p-8 bg-slate-950 border border-red-900/50 rounded-lg shadow-2xl overflow-hidden">
                {/* Background Stripes */}
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ef4444 0, #ef4444 10px, transparent 10px, transparent 20px)' }}></div>
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                    <div className="h-20 w-20 rounded-full bg-red-950/50 flex items-center justify-center border border-red-900 animate-pulse">
                        <Lock className="h-10 w-10 text-red-500" />
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-red-500 tracking-widest uppercase font-mono">Access Denied</h2>
                        <p className="text-sm font-mono text-red-400/70">
                            SECURETAG_API_KEY_MISSING<br/>
                            // AUTHORIZATION REQUIRED
                        </p>
                    </div>

                    <p className="text-slate-400 text-sm">
                        System requires valid credentials to access the project repository database.
                    </p>

                    <Button asChild className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900 hover:border-red-500 transition-all font-mono uppercase tracking-wider">
                        <Link to="/account">
                            <Terminal className="mr-2 h-4 w-4" /> Configure Keys
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen text-slate-200">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-500/80 mb-1">
                <Activity className="h-4 w-4 animate-pulse" />
                <span className="text-xs font-mono uppercase tracking-widest">System Operational</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white uppercase font-mono">Active Repositories</h1>
            <p className="text-white font-mono text-sm">
                // MANAGED ASSETS & CONFIGURATIONS
            </p>
        </div>
        
        <Link to="/sast/new">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white font-mono uppercase tracking-wider border border-blue-400/30 shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all">
            <Plus className="mr-2 h-4 w-4" /> Initialize Project
          </Button>
        </Link>
      </div>

      {/* Main Grid/List Area */}
      <Card className="bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-20"></div>
        
        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-sm font-mono text-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Database Query {isLoading && <span className="animate-pulse text-blue-500 ml-2">[ SCANNING... ]</span>}
            </CardTitle>
            
            <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                {/* Date Filter */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-md border border-slate-200 dark:border-slate-800">
                    <Calendar className="ml-2 h-4 w-4 text-slate-500" />
                    <div className="flex items-center gap-1">
                        <div className="relative">
                            <Input 
                                type="date" 
                                className="w-[110px] h-8 text-xs bg-transparent border-0 focus-visible:ring-0 p-0 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                onClick={(e) => {
                                    try {
                                        e.currentTarget.showPicker();
                                    } catch (err) {
                                        // Fallback or ignore if not supported
                                    }
                                }}
                            />
                        </div>
                        <span className="text-slate-400">-</span>
                        <div className="relative">
                            <Input 
                                type="date" 
                                className="w-[110px] h-8 text-xs bg-transparent border-0 focus-visible:ring-0 p-0 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                onClick={(e) => {
                                    try {
                                        e.currentTarget.showPicker();
                                    } catch (err) {
                                        // Fallback or ignore if not supported
                                    }
                                }}
                            />
                        </div>
                    </div>
                    {(startDate || endDate) && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
                            onClick={() => { setStartDate(""); setEndDate(""); }}
                        >
                            <span className="text-xs text-slate-500">×</span>
                        </Button>
                    )}
                </div>

                <div className="relative w-full md:w-64 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-md opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                <div className="relative bg-slate-100 dark:bg-black rounded-md flex items-center">
                    <span className="pl-3 text-slate-500 font-mono text-sm">{">_"}</span>
                    <Input
                        placeholder="SEARCH_TARGETS..."
                        className="pl-2 bg-transparent border-0 focus-visible:ring-0 text-black dark:text-white font-mono placeholder:text-slate-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="mr-3 h-4 w-4 text-slate-500" />
                </div>
                </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading && projects.length === 0 ? (
             <div className="p-8 text-center text-slate-500 font-mono animate-pulse">
                &gt; ESTABLISHING UPLINK...
             </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={AlertOctagon}
              title="System Idle. No Targets Acquired."
              description="No active repositories found in the database. Initialize a new project to begin security analysis."
              actionLabel="Initiate First Scan"
              actionTo="/sast/new"
            />
          ) : (
            <>
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-slate-200 dark:divide-slate-900"
            >
                {paginatedProjects.map((project: any, idx: number) => (
                    <motion.div 
                        key={project.id || `project-${idx}`}
                        variants={itemVariants}
                        className="group bg-white dark:bg-black hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors duration-300"
                    >
                        {/* Main Row */}
                        <div 
                            className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="flex items-start md:items-center gap-4">
                                <div className="h-10 w-10 rounded-md flex items-center justify-center border transition-all duration-300 bg-white dark:bg-black border-slate-200 dark:border-slate-800 text-slate-500 group-hover:border-slate-400 dark:group-hover:border-slate-700">
                                    <GitBranch className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                        {project.name && project.name.trim().length > 0 ? project.name : "Unnamed Project"}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                                        ID: {project.id.substring(0, 8)}...
                                        <span className="text-slate-400 dark:text-slate-700">|</span>
                                        {project.description || "No description provided"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 md:gap-8 pl-14 md:pl-0">
                                <div className="hidden md:block text-right">
                                    <p className="text-[10px] uppercase text-slate-600 dark:text-white font-mono mb-1">Last Activity</p>
                                    <div className="flex items-center gap-2 text-sm text-black dark:text-white font-mono">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </div>
                                </div>
                                
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-white dark:bg-black border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-mono text-xs h-9 tracking-wide"
                                    asChild
                                >
                                    <Link to={`/sast/projects/${project.alias}`}>
                                        [ ACCESS LOGS ]
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
            
            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-900 flex items-center justify-between bg-slate-50 dark:bg-black/50">
                    <span className="text-xs text-slate-500 font-mono">
                        Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
