import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction, getTenantInfo, getTenantMembers, inviteMember } from 'wasp/client/operations'
import { updateUserRole, removeUser } from 'wasp/client/operations' // TODO: Uncomment after Wasp generation
import { useToast } from "../../hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { 
  MoreHorizontal, 
  Plus, 
  Shield, 
  User as UserIcon, 
  Trash2,
  Clock
} from "lucide-react";

export default function OrganizationPage({ user }: { user: AuthUser }) {
  const { data: tenantInfo } = useQuery(getTenantInfo)
  const { data: members, isLoading: isMembersLoading, refetch: refetchMembers } = useQuery(getTenantMembers)
  const inviteMemberAction = useAction(inviteMember)
  const updateUserRoleAction = useAction(updateUserRole)
  const removeUserAction = useAction(removeUser)
  const { toast } = useToast()

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user.securetagRole === 'admin';

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
        await updateUserRoleAction({ userId, role: newRole })
        toast({ title: "Role updated", description: `User role updated to ${newRole}.` })
        refetchMembers();
    } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if(!confirm("Are you sure you want to remove this user?")) return;
    try {
        await removeUserAction({ userId })
        toast({ title: "User removed", description: "User has been removed from the organization." })
        refetchMembers();
    } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        await inviteMemberAction({ email: inviteEmail })
        toast({ title: "Invitation sent", description: `${inviteEmail} has been invited.` })
        setIsInviteOpen(false);
        setInviteEmail("");
        refetchMembers();
    } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their access levels.
          </p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleInvite}>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a new user. They will join as a Member.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>
            You are managing <strong>{tenantInfo?.name || "Loading..."}</strong> organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">Plan:</span> {tenantInfo?.plan || "Free"}
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">Members:</span> {members ? members.length : "-"}
              </div>
              {tenantInfo?.credits_balance !== undefined && (
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">Credits:</span> {tenantInfo.credits_balance}
                </div>
              )}
           </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            List of all users with access to this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMembersLoading && <TableRow><TableCell colSpan={5} className="text-center">Loading members...</TableCell></TableRow>}
              {members?.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{(member.email || "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{member.username || member.email?.split('@')[0]}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{member.status || "Active"}</span>
                  </TableCell>
                  <TableCell>
                     <span className="text-sm text-muted-foreground">
                        {member.joined_at ? new Date(member.joined_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                     </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, member.role === 'admin' ? 'member' : 'admin')}>
                            {member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveUser(member.id)}>
                           <Trash2 className="mr-2 h-4 w-4" /> Remove user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isMembersLoading && members?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center">No members found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
