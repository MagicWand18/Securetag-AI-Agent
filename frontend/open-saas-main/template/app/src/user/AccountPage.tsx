import { getCustomerPortalUrl, updateApiKey, useQuery, getTenantInfo, getSastDashboard, getApiKeys, createApiKey, deleteApiKey, deleteAccount } from "wasp/client/operations";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import type { User } from "wasp/entities";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { useState } from "react";
import { Terminal, Lock, Zap, Cpu, ScanLine, Trash2, Plus, Copy, Check, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "../client/components/ui/dialog";
import { Label } from "../client/components/ui/label";
import { SubscriptionStatus } from "../payment/plans";
import ProfileCard from "../client/components/react-bits/ProfileCard";

export default function AccountPage({ user }: { user: User }) {
  const { data: tenantInfo } = useQuery(getTenantInfo);
  const { data: sastStats } = useQuery(getSastDashboard);
  const { data: apiKeys, refetch: refetchApiKeys } = useQuery(getApiKeys);
  
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const handleCreateKey = async () => {
    if (!newKeyLabel.trim()) return;
    try {
      setIsCreatingKey(true);
      const newKey = await createApiKey({ label: newKeyLabel });
      setCreatedKey(newKey.key);
      setNewKeyLabel("");
      refetchApiKeys();
    } catch (error) {
      alert("Failed to create API Key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCreatedKey(null);
    setNewKeyLabel("");
  };

  const handleDeleteKey = async (id: string) => {
    if(!confirm("Are you sure? This action cannot be undone and any integration using this key will stop working.")) return;
    try {
        await deleteApiKey({ id });
        refetchApiKeys();
    } catch (e) {
        alert("Failed to delete API Key");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      await deleteAccount({});
      window.location.href = '/login'; // Force redirect after deletion
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert("Failed to delete account. Please try again or contact support.");
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteAccountOpen(false);
      setDeleteConfirmation("");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };


  return (
    <div className="mt-10 px-6 max-w-7xl mx-auto">
      {/* Identity Station Layout - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start justify-items-center">
        
        {/* Left Column: The Badge (Visual) */}
        <div className="w-full max-w-[400px]">
          <ProfileCard
            name={user.username || "Unknown Operative"}
            title={user.isAdmin ? "System Administrator" : "Security Operative"}
            handle={user.email || "unknown@securetag.ai"}
            status="System Active"
            contactText="Edit Profile"
            avatarUrl="/terminal.svg"
            showUserInfo={true}
            enableTilt={true}
            enableMobileTilt={false}
            behindGlowColor="#2F4BA2"
            onContactClick={() => {}}
          >
             <div className="pc-content w-full h-full p-5 flex flex-col relative overflow-hidden pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                 {/* ID Card Header */}
                 <div className="flex items-center justify-between mb-4 border-b border-blue-500/30 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center border border-blue-500/50">
                            <Cpu size={14} className="text-blue-400" />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-blue-300">SECURETAG AGENT</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-[8px] text-blue-500/60 font-mono">auth.v9</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]" />
                            <span className="text-[9px] font-bold text-green-400 tracking-wider">ACTIVE</span>
                        </div>
                    </div>
                 </div>

                 {/* Photo & Main Info Block */}
                 <div className="flex gap-4 mb-auto">
                     {/* Photo - Circular container */}
                     <div className="w-[120px] h-[120px] rounded-full bg-blue-900/10 border-2 border-blue-500/30 p-1 relative shrink-0 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full relative rounded-full overflow-hidden bg-black/40 flex items-center justify-center p-3">
                             <img 
                                src="/ST-blanco.png" 
                                alt="Operative" 
                                className="w-full h-full object-contain opacity-90"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent rounded-full pointer-events-none" />
                        </div>
                     </div>
                     
                     {/* All Details Stacked (Full Name, Job Title, Organization, Email, Phone, Class, Tier) */}
                     <div className="flex flex-col gap-2 flex-1 min-w-0 justify-center text-left items-start pl-6">
                         <div className="w-full">
                             <span className="text-[7px] text-blue-400/60 uppercase tracking-widest block text-left">Full Name</span>
                             <h3 className="text-sm font-bold text-white leading-tight truncate font-mono text-left">
                                 {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.username || "UNKNOWN")}
                             </h3>
                         </div>
                         <div className="w-full">
                             <span className="text-[7px] text-blue-400/60 uppercase tracking-widest block text-left">Job Title</span>
                             <div className="text-[10px] text-blue-200 font-mono truncate text-left">
                                {user.jobTitle || (user.isAdmin ? "System Administrator" : "Security Operative")}
                             </div>
                         </div>
                         <div className="w-full">
                             <span className="text-[7px] text-blue-400/60 uppercase tracking-widest block text-left">Organization</span>
                             <div className="text-[10px] text-blue-200 font-mono truncate text-left">
                                 {tenantInfo?.name || "SECURETAG AGENCY"}
                             </div>
                         </div>
                         <div className="w-full">
                             <span className="text-[7px] text-blue-500/50 uppercase tracking-widest block text-left">Email</span>
                             <div className="text-[9px] text-blue-100 font-mono tracking-wide truncate text-left">{user.email || "unknown@securetag.ai"}</div>
                         </div>
                         <div className="w-full">
                             <span className="text-[7px] text-blue-500/50 uppercase tracking-widest block text-left">Phone</span>
                             <div className="text-[9px] text-blue-100 font-mono tracking-wide text-left">
                                 {user.phoneNumber || "+52 555 000 0000"}
                             </div>
                         </div>
                         <div className="w-full">
                             <span className="text-[7px] text-blue-500/50 uppercase tracking-widest block text-left">Class</span>
                             <div className="text-[9px] text-blue-100 font-mono tracking-wide text-left">{user.isAdmin ? "ADMIN" : "MEMBER"}</div>
                         </div>
                         <div className="w-full">
                             <span className="text-[7px] text-blue-500/50 uppercase tracking-widest block text-left">Tier</span>
                             <div className="text-[9px] text-blue-100 font-mono tracking-wide text-left">
                                {tenantInfo?.plan ? tenantInfo.plan.toUpperCase() : "FREE"}
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Footer / Escudo */}
                 <div className="mt-4 flex items-end justify-between relative">
                     <div className="absolute left-1/2 -translate-x-1/2 bottom-0 opacity-80">
                         <img src="/mexicoescudo.png" alt="Escudo" className="h-16 w-auto drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                     </div>
                     
                     <div className="h-8 flex flex-col justify-end w-1/3">
                         {/* Spacer */}
                     </div>
                     
                     <div className="flex flex-col items-end w-1/3">
                        <div className="flex items-center gap-0.5 mb-1">
                             {[...Array(12)].map((_, i) => (
                                 <div key={i} className={`w-0.5 h-4 bg-blue-500/${Math.random() > 0.5 ? '40' : '20'}`} />
                             ))}
                        </div>
                        <span className="text-[7px] text-blue-500/40 font-mono tracking-[0.2em]">{user.id ? user.id.substring(user.id.length - 6).toUpperCase() : "000000"}</span>
                     </div>
                 </div>
             </div>
          </ProfileCard>
        </div>

        {/* Right Column: The Terminal (Data) */}
        <div className="w-full max-w-[400px]">
            <ProfileCard
                enableTilt={true}
                behindGlowColor="#ef4444" 
                innerGradient="linear-gradient(145deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 30, 45, 0.9) 100%)"
                className="font-mono"
            >
                 <div className="pc-content w-full h-full p-6 flex flex-col pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                     {/* Terminal Header */}
                     <div className="flex justify-between items-center mb-8 border-b border-red-500/20 pb-3">
                        <div className="flex items-center gap-2 text-red-400">
                            <Terminal size={14} />
                            <span className="text-[10px] tracking-[0.2em] font-bold">COMMAND_CENTER</span>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                        </div>
                     </div>

                     {/* API Keys Management */}
                     <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                                <Lock size={10} /> API ACCESS KEYS
                            </label>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-5 px-2 text-[9px] text-red-400 hover:text-red-300 border border-red-900/50 bg-red-950/20 hover:bg-red-900/30">
                                        <Plus size={10} className="mr-1" /> NEW KEY
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-200">
                                    <DialogHeader>
                                        <DialogTitle>Generate New API Key</DialogTitle>
                                        <DialogDescription className="text-slate-400">
                                            Create a new API key for your CI/CD pipelines or integrations.
                                        </DialogDescription>
                                    </DialogHeader>
                                    
                                    {!createdKey ? (
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="label">Key Label (e.g., "Jenkins Prod")</Label>
                                                <Input
                                                    id="label"
                                                    value={newKeyLabel}
                                                    onChange={(e) => setNewKeyLabel(e.target.value)}
                                                    placeholder="My Integration Key"
                                                    className="bg-slate-950 border-slate-800"
                                                />
                                            </div>
                                            <Button onClick={handleCreateKey} disabled={isCreatingKey || !newKeyLabel.trim()} className="w-full bg-red-600 hover:bg-red-700 text-white">
                                                {isCreatingKey ? "Generating..." : "Generate Key"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 py-4">
                                            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-md">
                                                <p className="text-xs text-green-400 mb-2 font-bold">KEY GENERATED SUCCESSFULLY</p>
                                                <p className="text-[10px] text-slate-400 mb-3">Make sure to copy this key now. You won't be able to see it again!</p>
                                                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                                                    <code className="flex-1 font-mono text-xs text-green-300 break-all">{createdKey}</code>
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(createdKey, "new")}>
                                                        {copiedKeyId === "new" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button onClick={handleCloseDialog} variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                                                Close
                                            </Button>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                            {apiKeys && apiKeys.length > 0 ? (
                                apiKeys.map((key: any) => (
                                    <div key={key.id} className="bg-black/40 border border-slate-800/50 p-2 rounded flex items-center justify-between group/key hover:border-slate-700 transition-all">
                                        <div className="flex flex-col min-w-0 flex-1 pr-3">
                                            <span className="text-[10px] text-slate-300 font-medium truncate">{key.label}</span>
                                            <span className="text-[9px] text-slate-600 font-mono truncate">
                                                {key.key.substring(0, 12)}...
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[8px] text-slate-600 mr-2">
                                                {new Date(key.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-5 w-5 p-0 text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                                                onClick={() => handleDeleteKey(key.id)}
                                            >
                                                <Trash2 size={10} />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[10px] text-slate-600 italic text-center py-2">
                                    No API Keys generated
                                </div>
                            )}
                        </div>
                     </div>

                     {/* Credits Progress */}
                     <div className="mb-8">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-2 font-mono">
                  <span className="tracking-wider">CREDITS_AVAILABLE</span>
                  <span className="text-red-400">{user.credits}</span>
                </div>
                     </div>

                     {/* System Metrics */}
                     <div className="space-y-4 mt-auto">
                         <div className="grid grid-cols-2 gap-4">
                             <div className="group">
                                 <label className="text-[9px] text-slate-500 block mb-1 tracking-widest">ACTIVE_SCANS</label>
                                 <div className="text-xl font-mono text-red-400 group-hover:text-red-300 transition-colors">
                                     {sastStats?.stats?.activeScans || 0} <span className="text-[10px] text-slate-600">RUNNING</span>
                                 </div>
                             </div>
                             <div className="group">
                                 <label className="text-[9px] text-slate-500 block mb-1 tracking-widest">THREAT_LEVEL</label>
                                  <div className="text-xl font-mono text-red-400 group-hover:text-red-300 transition-colors">
                                     {sastStats?.stats?.totalVulns || 0} <span className="text-[10px] text-slate-600">DETECTED</span>
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* Delete Account Zone */}
                     <div className="mt-8 border-t border-red-500/30 pt-4">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-red-400/80">
                                <AlertTriangle size={12} />
                                <span className="text-[8px] uppercase tracking-widest font-bold">Danger Zone</span>
                            </div>
                            <Dialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors border border-red-900/30">
                                        DELETE ACCOUNT
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-slate-900 border-red-900/50 text-slate-200">
                                    <DialogHeader>
                                        <DialogTitle className="text-red-500 flex items-center gap-2">
                                            <AlertTriangle size={20} />
                                            Delete Account
                                        </DialogTitle>
                                        <DialogDescription className="text-slate-400">
                                            This action is <strong className="text-red-400">irreversible</strong>. This will permanently delete your account, API keys, and remove your data from our servers.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <p className="text-sm text-slate-300 mb-4">Are you absolutely sure you want to proceed? This action will permanently remove your data.</p>
                                        <div className="space-y-2">
                                            <Label htmlFor="delete-confirm" className="text-xs text-slate-500">
                                                Please type <span className="text-red-400 font-mono font-bold">{user.email}</span> to confirm.
                                            </Label>
                                            <Input
                                                id="delete-confirm"
                                                value={deleteConfirmation}
                                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                                placeholder={user.email || ""}
                                                className="bg-slate-950 border-slate-800 text-slate-200"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button variant="outline" onClick={() => setIsDeleteAccountOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                            Cancel
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            onClick={handleDeleteAccount} 
                                            disabled={isDeletingAccount || deleteConfirmation !== user.email}
                                            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDeletingAccount ? "Deleting..." : "Yes, Delete Account"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                         </div>
                     </div>
                 </div>
            </ProfileCard>
        </div>
      </div>
    </div>
  );
}

function CustomerPortalButton() {
  const { data: customerPortalUrl, isLoading: isCustomerPortalUrlLoading } =
    useQuery(getCustomerPortalUrl);

  if (!customerPortalUrl) {
    return null;
  }

  return (
    <a href={customerPortalUrl} target="_blank" rel="noopener noreferrer">
      <Button disabled={isCustomerPortalUrlLoading} variant="link" className="p-0 h-auto text-blue-400 hover:text-blue-300 text-xs">
        Manage Billing
      </Button>
    </a>
  );
}

function BuyMoreButton({
  subscriptionStatus,
}: Pick<User, "subscriptionStatus">) {
  if (
    subscriptionStatus === SubscriptionStatus.ACTIVE ||
    subscriptionStatus === SubscriptionStatus.CANCELLED
  ) {
    return null;
  }

  return (
    <WaspRouterLink
      to={routes.DashboardRoute.to}
      className="text-pink-500 hover:text-pink-400 text-xs font-medium transition-colors duration-200 uppercase"
    >
      [Buy Credits]
    </WaspRouterLink>
  );
}
