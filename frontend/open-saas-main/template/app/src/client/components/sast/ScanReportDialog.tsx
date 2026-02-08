import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useQuery, getScanResults } from "wasp/client/operations";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Terminal, Cpu, Target, ShieldAlert } from "lucide-react";
import { cn } from "../../utils";

interface ScanReportDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultConfig?: {
    qty?: number;
    model?: string;
  };
}

export function ScanReportDialog({ taskId, open, onOpenChange, defaultConfig }: ScanReportDialogProps) {
  const { data: scanResult, isLoading } = useQuery(getScanResults, { taskId: taskId || "" }, {
    enabled: !!taskId && open,
  });

  // Extract Custom Rules Data
  // Data comes from scanResult.result.custom_rules (merged config + summary)
  const customRulesData = scanResult?.result?.custom_rules || {};
  
  // Calculate stats
  const requestedQty = customRulesData.qty || defaultConfig?.qty || 0;
  const modelUsed = customRulesData.model || defaultConfig?.model || "Unknown";
  const failureCount = customRulesData.failures || 0;
  const successCount = customRulesData.successes || 0;
  
  // We don't have the full list of generated rules in the backend response yet,
  // but we can infer the count.
  // If the backend eventually returns 'generated_rules' array, use it.
  const generatedRules = customRulesData.generated_rules || [];
  
  // Detect if we have unified data (both successes and failures with details)
  const hasUnifiedData = generatedRules.length > 0 && generatedRules[0].status !== undefined;
  
  const generatedQty = successCount || generatedRules.filter((r: any) => r.status !== 'failed').length;
  
  const refundAmount = scanResult?.result?.summary?.refund_amount || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-slate-200">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <DialogTitle className="text-xl font-mono flex items-center gap-2 text-white">
            <Terminal className="h-5 w-5 text-purple-500" />
            CUSTOM RULES EXECUTION LOG
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-slate-500">
            TRANSACTION ID: {taskId}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            <p className="font-mono text-xs text-slate-500 animate-pulse">RETRIEVING NEURAL LOGS...</p>
          </div>
        ) : !scanResult ? (
           <div className="py-8 text-center font-mono text-red-400">
             ERROR: UNABLE TO RETRIEVE SCAN DATA
           </div>
        ) : (
          <div className="space-y-6 py-4">
            
            {/* 1. Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-md">
                <p className="text-[10px] uppercase text-slate-500 font-mono">Requested</p>
                <div className="text-2xl font-bold font-mono text-white">{requestedQty}</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-md">
                <p className="text-[10px] uppercase text-slate-500 font-mono">Model</p>
                <div className="text-lg font-bold font-mono text-blue-400 truncate" title={modelUsed}>
                  {modelUsed}
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-md">
                <p className="text-[10px] uppercase text-green-400/70 font-mono">Generated</p>
                <div className="text-2xl font-bold font-mono text-green-400">{generatedQty}</div>
              </div>
              <div className={cn(
                "border p-3 rounded-md",
                failureCount > 0 ? "bg-red-500/10 border-red-500/20" : "bg-slate-900/50 border-slate-800"
              )}>
                <p className={cn("text-[10px] uppercase font-mono", failureCount > 0 ? "text-red-400/70" : "text-slate-500")}>
                  Failed
                </p>
                <div className={cn("text-2xl font-bold font-mono", failureCount > 0 ? "text-red-400" : "text-slate-500")}>
                  {failureCount}
                </div>
              </div>
            </div>

            {/* 2. Refund Banner */}
            {refundAmount > 0 && (
              <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-blue-400 text-xs font-mono">
                <ShieldAlert className="h-4 w-4" />
                <span>
                  REFUND PROCESSED: {refundAmount} CREDITS RETURNED TO BALANCE DUE TO GENERATION ERRORS.
                </span>
              </div>
            )}

            {/* 3. Details Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-2">
                <Cpu className="h-3 w-3" />
                Generation Details
              </h3>
              
              <div className="rounded-md border border-slate-800 overflow-hidden bg-slate-900/20">
                <ScrollArea className="h-[250px]">
                  {generatedQty === 0 && failureCount === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-slate-600 flex flex-col items-center gap-2">
                      <Target className="h-6 w-6 opacity-20" />
                      NO CUSTOM RULES DATA AVAILABLE
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-900 sticky top-0 z-10">
                        <TableRow className="hover:bg-slate-900 border-slate-800">
                          <TableHead className="w-[100px] text-[10px] uppercase font-mono text-slate-500 h-8">Target</TableHead>
                          <TableHead className="text-[10px] uppercase font-mono text-slate-500 h-8">Rule Name / Content</TableHead>
                          <TableHead className="text-right text-[10px] uppercase font-mono text-slate-500 h-8">Status</TableHead>
                          <TableHead className="text-right text-[10px] uppercase font-mono text-slate-500 h-8">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Generated Rules (Unified or Legacy Successes) */}
                        {(generatedRules.length > 0 ? generatedRules : Array.from({ length: successCount })).map((rule: any, idx: number) => {
                          const isFailed = rule?.status === 'failed';
                          
                          if (isFailed) {
                             return (
                              <TableRow key={`gen-fail-${idx}`} className="hover:bg-red-500/5 border-slate-800 bg-red-500/5">
                                <TableCell className="font-mono text-xs text-red-400/70 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <Target className="h-3 w-3" />
                                    {rule?.target || "UNKNOWN"}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-red-400/70 italic py-2">
                                  <div className="truncate max-w-[300px]" title={rule?.error || "Generation failed"}>
                                     {rule?.name || "Generation failed for requested rule"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] px-1 py-0 h-5 inline-flex items-center">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    FAILED
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right py-2">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-red-400" title="View Logs">
                                        <Terminal className="h-3 w-3" />
                                    </Button>
                                </TableCell>
                              </TableRow>
                             );
                          }

                          return (
                          <TableRow key={`gen-${idx}`} className="hover:bg-slate-900/50 border-slate-800 group">
                            <TableCell className="font-mono text-xs text-slate-400 py-2">
                              <div className="flex items-center gap-1.5">
                                <Target className="h-3 w-3 text-slate-600 group-hover:text-purple-400 transition-colors" />
                                {rule?.target || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-300 py-2">
                              <div className="truncate max-w-[300px]" title={rule?.name || "Custom Rule"}>
                                {rule?.name || `Generated Rule #${idx + 1}`}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] px-1 py-0 h-5 inline-flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                CREATED
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-purple-400" title="View Logs">
                                    <Terminal className="h-3 w-3" />
                                </Button>
                            </TableCell>
                          </TableRow>
                        )})}

                        {/* Failed Rules Representation (Legacy Fallback only) */}
                        {!hasUnifiedData && Array.from({ length: typeof failureCount === 'number' ? failureCount : 0 }).map((_, idx) => (
                          <TableRow key={`fail-${idx}`} className="hover:bg-red-500/5 border-slate-800 bg-red-500/5">
                            <TableCell className="font-mono text-xs text-red-400/70 py-2">
                              <div className="flex items-center gap-1.5">
                                <Target className="h-3 w-3" />
                                UNKNOWN
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-red-400/70 italic py-2">
                              Generation failed for requested rule
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] px-1 py-0 h-5 inline-flex items-center">
                                <XCircle className="h-3 w-3 mr-1" />
                                FAILED
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-red-400" title="View Logs">
                                    <Terminal className="h-3 w-3" />
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
