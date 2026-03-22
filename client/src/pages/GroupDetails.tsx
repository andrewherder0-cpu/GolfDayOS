import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Users, Calendar, UserPlus, Send, Mail, Clock, Crown, Shield, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/lib/AuthProvider";
import type { Group, Event, User, Membership, Invitation } from "@shared/schema";

interface GroupWithDetails extends Group {
  members: (Membership & { user: User })[];
  events: Event[];
}

export default function GroupDetails() {
  const [, params] = useRoute("/groups/:id");
  const groupId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuthContext();
  const [, setLocation] = useLocation();
  const [joinCodeDialogOpen, setJoinCodeDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [removeMemberUserId, setRemoveMemberUserId] = useState<string | null>(null);

  const { data: group, isLoading } = useQuery<GroupWithDetails>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  const isOwner = group && currentUser && group.ownerId === currentUser.id;
  const currentUserMembership = group?.members.find(m => m.userId === currentUser?.id);
  const isOwnerOrOrg = isOwner || currentUserMembership?.role === "organizer";

  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: ["/api/groups", groupId, "invitations"],
    queryFn: () => fetch(`/api/groups/${groupId}/invitations`).then(r => r.json()),
    enabled: !!groupId && !!isOwner,
  });

  const sendEmailInviteMutation = useMutation({
    mutationFn: (email: string) =>
      apiRequest("POST", `/api/groups/${groupId}/invite`, { email }),
    onSuccess: (_data, email) => {
      toast({ title: "Invitation sent!", description: `An invite was sent to ${email}` });
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "invitations"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invite", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "organizer" | "member" }) =>
      apiRequest("PATCH", `/api/groups/${groupId}/members/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      toast({ title: "Role updated!" });
    },
    onError: (e: Error) => toast({ title: "Failed to update role", description: e.message, variant: "destructive" }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string): Promise<{ success: boolean }> => {
      return apiRequest<{ success: boolean }>("DELETE", `/api/groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      setRemoveMemberUserId(null);
      toast({ title: "Member removed from group" });
    },
    onError: (e: Error) => toast({ title: "Failed to remove member", description: e.message, variant: "destructive" }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (): Promise<{ success: boolean }> => {
      return apiRequest<{ success: boolean }>("DELETE", `/api/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Group deleted" });
      setLocation("/dashboard");
    },
    onError: (e: Error) => toast({ title: "Failed to delete group", description: e.message, variant: "destructive" }),
  });

  const copyJoinCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.joinCode);
      toast({ title: "Join code copied to clipboard!" });
    }
  };

  const pendingInvitations = (invitations ?? []).filter(inv => !inv.acceptedAt && new Date(inv.expiresAt) > new Date());

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!group) {
    return (
      <main className="max-w-7xl mx-auto p-8">
        <p>Group not found</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-8">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: group.name }]} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Group Info */}
          <div className="lg:col-span-1">
            <Card className="p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold mb-2" data-testid="text-group-name">{group.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Join Code</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-lg tracking-wider flex-1 px-3 py-2 bg-muted rounded-lg" data-testid="text-join-code">
                      {group.joinCode}
                    </code>
                    <Button size="icon" variant="outline" onClick={copyJoinCode} data-testid="button-copy-code">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Dialog open={joinCodeDialogOpen} onOpenChange={setJoinCodeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" data-testid="button-invite-members">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Members</DialogTitle>
                      <DialogDescription>
                        Share the join code or send a direct email invitation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                      <div>
                        <Label className="text-sm font-medium">Join Code</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            value={group.joinCode}
                            readOnly
                            className="font-mono tracking-wider"
                            data-testid="input-join-code-display"
                          />
                          <Button size="icon" variant="outline" onClick={copyJoinCode} data-testid="button-copy-code-dialog">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Members enter this code on the Join Group page
                        </p>
                      </div>

                      {isOwner && (
                        <div className="border-t pt-4">
                          <Label htmlFor="invite-email" className="text-sm font-medium">Send Email Invitation</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              id="invite-email"
                              type="email"
                              placeholder="friend@example.com"
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter" && inviteEmail) {
                                  sendEmailInviteMutation.mutate(inviteEmail);
                                }
                              }}
                              data-testid="input-invite-email"
                            />
                            <Button
                              onClick={() => sendEmailInviteMutation.mutate(inviteEmail)}
                              disabled={!inviteEmail || sendEmailInviteMutation.isPending}
                              data-testid="button-send-invite-email"
                            >
                              <Send className="h-4 w-4 mr-1" />
                              {sendEmailInviteMutation.isPending ? "Sending..." : "Send"}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            They'll receive a personal link valid for 7 days
                          </p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {isOwnerOrOrg && (
                  <Link href={`/groups/${groupId}/events/new`}>
                    <a>
                      <Button className="w-full" data-testid="button-new-event">
                        <Plus className="h-4 w-4 mr-2" />
                        New Event
                      </Button>
                    </a>
                  </Link>
                )}
              </div>
            </Card>

            {/* Members List */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {group.members.map((membership) => {
                    const isThisOwner = membership.userId === group.ownerId;
                    const isCurrentUser = membership.userId === currentUser?.id;
                    return (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between py-2 border-b last:border-0 gap-3"
                        data-testid={`member-${membership.userId}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isThisOwner ? (
                            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          ) : membership.role === "organizer" ? (
                            <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <span className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {membership.user.name}
                              {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{membership.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isThisOwner ? (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400" data-testid={`badge-role-${membership.userId}`}>
                              Owner
                            </Badge>
                          ) : isOwner ? (
                            <>
                              <Select
                                value={membership.role}
                                onValueChange={(role) =>
                                  updateRoleMutation.mutate({ userId: membership.userId, role: role as "organizer" | "member" })
                                }
                              >
                                <SelectTrigger className="h-7 text-xs w-28" data-testid={`select-role-${membership.userId}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="organizer">Organizer</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setRemoveMemberUserId(membership.userId)}
                                data-testid={`button-remove-member-${membership.userId}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              data-testid={`badge-role-${membership.userId}`}
                            >
                              {membership.role === "organizer" ? "Organizer" : "Member"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Delete Group (owner only) */}
            {isOwner && (
              <Card className="mt-4 border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Permanently delete this group and all its events</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteGroupDialogOpen(true)}
                    data-testid="button-delete-group"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Pending Invitations (owner only) */}
            {isOwner && pendingInvitations.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>Sent but not yet accepted</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-start justify-between py-2 border-b last:border-0"
                        data-testid={`invitation-${inv.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" data-testid={`invitation-email-${inv.id}`}>{inv.email}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            Sent {new Date(inv.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Confirmation: Delete Group */}
          <Dialog open={deleteGroupDialogOpen} onOpenChange={setDeleteGroupDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Group</DialogTitle>
                <DialogDescription>
                  This will permanently delete <strong>{group.name}</strong> and all its events, polls, RSVPs, and pairings. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setDeleteGroupDialogOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteGroupMutation.mutate()}
                  disabled={deleteGroupMutation.isPending}
                  data-testid="button-confirm-delete-group"
                >
                  {deleteGroupMutation.isPending ? "Deleting..." : "Delete Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmation: Remove Member */}
          {removeMemberUserId && (
            <Dialog open={!!removeMemberUserId} onOpenChange={() => setRemoveMemberUserId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove Member</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove{" "}
                    <strong>
                      {group.members.find(m => m.userId === removeMemberUserId)?.user.name ?? "this member"}
                    </strong>{" "}
                    from the group? They will need a new join code or invitation to rejoin.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setRemoveMemberUserId(null)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => removeMemberMutation.mutate(removeMemberUserId)}
                    disabled={removeMemberMutation.isPending}
                    data-testid="button-confirm-remove-member"
                  >
                    {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Events List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Events</h2>
            </div>

            <div className="space-y-4">
              {group.events.length > 0 ? (
                group.events.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <a>
                      <Card className="hover-elevate cursor-pointer" data-testid={`card-event-${event.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <CardTitle className="text-lg">{event.title}</CardTitle>
                              <CardDescription>Capacity: {event.capacity}</CardDescription>
                            </div>
                            <StatusBadge status={event.state} />
                          </div>
                        </CardHeader>
                        {event.notes && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{event.notes}</p>
                          </CardContent>
                        )}
                      </Card>
                    </a>
                  </Link>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">No events yet</p>
                    {isOwnerOrOrg ? (
                      <Link href={`/groups/${groupId}/events/new`}>
                        <a>
                          <Button size="sm" data-testid="button-create-first-event">
                            Create your first event
                          </Button>
                        </a>
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground">Events will appear here once an organizer creates one.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
    </main>
  );
}
