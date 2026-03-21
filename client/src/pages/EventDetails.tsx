import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { CapacityBar } from "@/components/CapacityBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar, MapPin, Users, Vote, CheckCircle2, MessageSquare, Map,
  ClipboardList, Settings, UserCog, Send, Mail, Crown, Shield,
} from "lucide-react";
import { useState } from "react";
import type { Event, Group, Course, Poll, Rsvp, User, Membership } from "@shared/schema";
import { ChatView } from "@/components/ChatView";
import { CourseMapView } from "@/components/CourseMapView";

interface MemberWithUser extends Membership {
  user: User;
}

interface EventWithDetails extends Event {
  group: Group;
  course?: Course;
  polls: Poll[];
  rsvps: (Rsvp & { user: User })[];
  members: MemberWithUser[];
  membership: Membership;
}

interface PollWithOptions extends Poll {
  options: { id: string; label?: string; courseId?: string; dateOption?: string; voteCount: number; course?: Course }[];
  userVote?: string;
}

interface Invitation {
  id: string;
  email: string;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export default function EventDetails() {
  const [, params] = useRoute("/events/:id");
  const eventId = params?.id;
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [createCoursePoll, setCreateCoursePoll] = useState(true);
  const [createDatePoll, setCreateDatePoll] = useState(true);

  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [sendUpdateMsg, setSendUpdateMsg] = useState("");
  const [sendUpdateDialogOpen, setSendUpdateDialogOpen] = useState(false);

  const { data: event, isLoading } = useQuery<EventWithDetails>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: detailedPolls } = useQuery<PollWithOptions[]>({
    queryKey: ["/api/polls/event", eventId],
    enabled: !!eventId,
  });

  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: ["/api/groups", event?.groupId, "invitations"],
    enabled: !!event?.groupId,
  });

  const openPollsMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/events/${eventId}/polls/open`, { createCoursePoll, createDatePoll }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Polls opened successfully!" });
      setPollDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openRsvpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/rsvp/open`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "RSVP period opened!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/finalize`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Event finalized!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateEventMutation = useMutation({
    mutationFn: (data: { title?: string; notes?: string; capacity?: number }) =>
      apiRequest("PATCH", `/api/events/${eventId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Event updated!" });
      setEditDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendUpdateMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", `/api/events/${eventId}/send-update`, { message }),
    onSuccess: async (res) => {
      const data = await res.json().catch(() => ({}));
      toast({ title: `Update sent to ${data.recipientCount ?? 0} members!` });
      setSendUpdateMsg("");
      setSendUpdateDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiRequest("PATCH", `/api/groups/${event?.groupId}/members/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Role updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto p-8">
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  const isOwner = event.createdBy === user?.id;
  const isOrganizer = isOwner || event.membership?.role === "organizer" || event.membership?.role === "owner";
  const joinedCount = event.rsvps.filter((r) => r.status === "joined").length;
  const waitlistedCount = event.rsvps.filter((r) => r.status === "waitlisted").length;
  const coursePoll = event.polls?.find(p => p.type === "course");
  const datePoll = event.polls?.find(p => p.type === "date");

  const defaultTab = event.state === "polling" ? "polls"
    : event.state === "rsvp" ? "rsvp"
    : event.state === "final" || event.state === "closed" ? "rsvp"
    : "overview";

  function initials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }

  function getRsvpStatus(userId: string) {
    const rsvp = event.rsvps.find(r => r.userId === userId);
    return rsvp?.status ?? null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto p-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: event.group.name, href: `/groups/${event.groupId}` },
            { label: event.title },
          ]}
        />

        <div className="mt-6 mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-event-title">{event.title}</h1>
            <Link href={`/groups/${event.groupId}`}>
              <a className="text-muted-foreground hover:text-foreground text-sm mt-1 inline-block">
                {event.group.name}
              </a>
            </Link>
          </div>
          <StatusBadge status={event.state} />
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6 flex-wrap gap-1 h-auto" data-testid="event-tabs">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <ClipboardList className="h-4 w-4 mr-2" />Overview
            </TabsTrigger>
            <TabsTrigger value="polls" data-testid="tab-polls">
              <Vote className="h-4 w-4 mr-2" />Polls
            </TabsTrigger>
            <TabsTrigger value="rsvp" data-testid="tab-rsvp">
              <Users className="h-4 w-4 mr-2" />RSVP
            </TabsTrigger>
            <TabsTrigger value="players" data-testid="tab-players">
              <UserCog className="h-4 w-4 mr-2" />Players
            </TabsTrigger>
            <TabsTrigger value="map" data-testid="tab-map">
              <Map className="h-4 w-4 mr-2" />Course Map
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageSquare className="h-4 w-4 mr-2" />Chat
            </TabsTrigger>
            {isOrganizer && (
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings className="h-4 w-4 mr-2" />Settings
              </TabsTrigger>
            )}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {event.notes && (
                      <p className="text-muted-foreground" data-testid="text-event-notes">{event.notes}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {event.course && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Course</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span data-testid="text-course-name">{event.course.name}</span>
                          </div>
                        </div>
                      )}
                      {event.chosenDate && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Date</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span data-testid="text-event-date">
                              {new Date(event.chosenDate).toLocaleDateString("en-US", {
                                weekday: "long", year: "numeric", month: "long", day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      )}
                      {!event.course && !event.chosenDate && (
                        <p className="text-sm text-muted-foreground col-span-2">
                          Course and date will be determined by polls.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CapacityBar current={joinedCount} total={event.capacity} />
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{joinedCount} confirmed</span>
                      {waitlistedCount > 0 && (
                        <span data-testid="text-waitlist-count">{waitlistedCount} on waitlist</span>
                      )}
                      <span>Capacity: {event.capacity}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {event.state === "polling" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Vote className="h-4 w-4" />Polls Active
                      </CardTitle>
                      <CardDescription>Voting is open</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href={`/events/${eventId}/polls`}>
                        <a><Button className="w-full" data-testid="button-go-to-polls">View &amp; Vote</Button></a>
                      </Link>
                    </CardContent>
                  </Card>
                )}
                {(event.state === "rsvp" || event.state === "final" || event.state === "closed") && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />RSVP
                      </CardTitle>
                      <CardDescription>Manage your attendance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href={`/events/${eventId}/rsvp`}>
                        <a><Button className="w-full" data-testid="button-go-to-rsvp">View RSVP Details</Button></a>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* POLLS TAB */}
          <TabsContent value="polls">
            {event.state === "polling" ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Polls</CardTitle>
                    <CardDescription>Cast your vote on the course and date for this event</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {coursePoll && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Course Poll</p>
                          <p className="text-xs text-muted-foreground">Vote for your preferred venue</p>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">{coursePoll.visibility}</span>
                      </div>
                    )}
                    {datePoll && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Date Poll</p>
                          <p className="text-xs text-muted-foreground">Vote for your preferred date</p>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">{datePoll.visibility}</span>
                      </div>
                    )}
                    <div className="pt-2">
                      <Link href={`/events/${eventId}/polls`}>
                        <a>
                          <Button data-testid="button-view-polls">
                            <Vote className="h-4 w-4 mr-2" />View &amp; Vote on Polls
                          </Button>
                        </a>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : event.state === "draft" ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Vote className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">Polls haven't been opened yet.</p>
                  {isOrganizer && (
                    <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-open-polls">Open Polls</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Open Polls</DialogTitle>
                          <DialogDescription>Create polls for group members to vote on course and date</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="coursePoll" checked={createCoursePoll}
                              onCheckedChange={(c) => setCreateCoursePoll(c as boolean)}
                              data-testid="checkbox-course-poll" />
                            <Label htmlFor="coursePoll" className="cursor-pointer">Create Course Poll</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="datePoll" checked={createDatePoll}
                              onCheckedChange={(c) => setCreateDatePoll(c as boolean)}
                              data-testid="checkbox-date-poll" />
                            <Label htmlFor="datePoll" className="cursor-pointer">Create Date Poll</Label>
                          </div>
                          <Button onClick={() => openPollsMutation.mutate()}
                            disabled={openPollsMutation.isPending || (!createCoursePoll && !createDatePoll)}
                            data-testid="button-confirm-open-polls">
                            {openPollsMutation.isPending ? "Opening..." : "Open Polls"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Polling has closed.</p>
                  {event.course && <p className="text-sm mt-1">Chosen course: <strong>{event.course.name}</strong></p>}
                  {event.chosenDate && (
                    <p className="text-sm mt-1">Chosen date: <strong>{new Date(event.chosenDate).toLocaleDateString()}</strong></p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* RSVP TAB */}
          <TabsContent value="rsvp">
            {event.state === "rsvp" || event.state === "final" || event.state === "closed" ? (
              <Card>
                <CardHeader>
                  <CardTitle>RSVP Management</CardTitle>
                  <CardDescription>View and manage attendance for this event</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CapacityBar current={joinedCount} total={event.capacity} />
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{joinedCount} confirmed</span>
                    {waitlistedCount > 0 && <span data-testid="text-waitlist-count">{waitlistedCount} on waitlist</span>}
                  </div>
                  <Link href={`/events/${eventId}/rsvp`}>
                    <a>
                      <Button data-testid="button-go-to-rsvp">
                        <Users className="h-4 w-4 mr-2" />View Full RSVP List
                      </Button>
                    </a>
                  </Link>
                  {event.state === "final" && isOrganizer && (
                    <div className="pt-2">
                      <Link href={`/events/${eventId}/pairings`}>
                        <a>
                          <Button variant="outline" data-testid="button-manage-pairings">
                            <Users className="h-4 w-4 mr-2" />Manage Pairings
                          </Button>
                        </a>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">RSVP opens after polling is complete.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PLAYERS TAB */}
          <TabsContent value="players">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />Group Members
                </CardTitle>
                <CardDescription>
                  {event.members?.length ?? 0} members · {joinedCount} confirmed for this event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(event.members ?? []).map((member) => {
                    const rsvpStatus = getRsvpStatus(member.userId);
                    const isCreator = member.userId === event.createdBy;
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                        data-testid={`player-row-${member.userId}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{initials(member.user?.name ?? "?")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.user?.name}</p>
                            <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                          </div>
                          {isCreator && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Crown className="h-3 w-3" />Owner
                            </Badge>
                          )}
                          {!isCreator && member.role === "organizer" && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Shield className="h-3 w-3" />Organizer
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {rsvpStatus === "joined" && (
                            <Badge variant="default" className="text-xs" data-testid={`rsvp-status-${member.userId}`}>Confirmed</Badge>
                          )}
                          {rsvpStatus === "waitlisted" && (
                            <Badge variant="outline" className="text-xs" data-testid={`rsvp-status-${member.userId}`}>Waitlisted</Badge>
                          )}
                          {rsvpStatus === "withdrawn" && (
                            <Badge variant="outline" className="text-xs text-muted-foreground" data-testid={`rsvp-status-${member.userId}`}>Withdrawn</Badge>
                          )}
                          {!rsvpStatus && (
                            <span className="text-xs text-muted-foreground" data-testid={`rsvp-status-${member.userId}`}>No RSVP</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MAP TAB */}
          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />GTA Course Map
                </CardTitle>
                <CardDescription>Browse local courses and add them to the course poll</CardDescription>
              </CardHeader>
              <CardContent>
                <CourseMapView coursePoll={coursePoll} isOrganizer={isOrganizer} eventId={event.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHAT TAB */}
          <TabsContent value="chat">
            <Card className="flex flex-col" style={{ height: 520 }}>
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />Group Chat
                </CardTitle>
                <CardDescription>Chat with your group about this event</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 min-h-0">
                <ChatView eventId={event.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS TAB (organizer only) */}
          {isOrganizer && (
            <TabsContent value="settings">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Lifecycle Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />Event Lifecycle
                    </CardTitle>
                    <CardDescription>Advance the event through its stages</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.state === "draft" && (
                      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-open-polls">
                            <Vote className="h-4 w-4 mr-2" />Open Polls
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Open Polls</DialogTitle>
                            <DialogDescription>Create polls for group members to vote on course and date</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="coursePoll2" checked={createCoursePoll}
                                onCheckedChange={(c) => setCreateCoursePoll(c as boolean)}
                                data-testid="checkbox-course-poll" />
                              <Label htmlFor="coursePoll2" className="cursor-pointer">Create Course Poll</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="datePoll2" checked={createDatePoll}
                                onCheckedChange={(c) => setCreateDatePoll(c as boolean)}
                                data-testid="checkbox-date-poll" />
                              <Label htmlFor="datePoll2" className="cursor-pointer">Create Date Poll</Label>
                            </div>
                            <Button onClick={() => openPollsMutation.mutate()}
                              disabled={openPollsMutation.isPending || (!createCoursePoll && !createDatePoll)}
                              data-testid="button-confirm-open-polls">
                              {openPollsMutation.isPending ? "Opening..." : "Open Polls"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {event.state === "polling" && (
                      <div className="space-y-2">
                        <Link href={`/events/${eventId}/polls`}>
                          <a><Button data-testid="button-view-polls">
                            <Vote className="h-4 w-4 mr-2" />View Polls
                          </Button></a>
                        </Link>
                        {event.chosenCourseId && event.chosenDate && (
                          <Button onClick={() => openRsvpMutation.mutate()}
                            disabled={openRsvpMutation.isPending}
                            data-testid="button-open-rsvp">
                            Open RSVP
                          </Button>
                        )}
                      </div>
                    )}

                    {event.state === "rsvp" && (
                      <Button onClick={() => finalizeMutation.mutate()}
                        disabled={finalizeMutation.isPending}
                        data-testid="button-finalize">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {finalizeMutation.isPending ? "Finalizing..." : "Finalize Event"}
                      </Button>
                    )}

                    {event.state === "final" && (
                      <Link href={`/events/${eventId}/pairings`}>
                        <a><Button data-testid="button-manage-pairings">
                          <Users className="h-4 w-4 mr-2" />Manage Pairings
                        </Button></a>
                      </Link>
                    )}

                    {event.state === "closed" && (
                      <p className="text-sm text-muted-foreground">This event is closed.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Edit Event Details (draft only) */}
                {event.state === "draft" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Edit Event</CardTitle>
                      <CardDescription>Update event title, notes, or capacity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Dialog open={editDialogOpen} onOpenChange={(open) => {
                        setEditDialogOpen(open);
                        if (open) {
                          setEditTitle(event.title);
                          setEditNotes(event.notes ?? "");
                          setEditCapacity(String(event.capacity));
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" data-testid="button-edit-event">Edit Details</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Event</DialogTitle>
                            <DialogDescription>Update event information</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-title">Title</Label>
                              <Input id="edit-title" value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                data-testid="input-edit-title" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-notes">Notes</Label>
                              <Textarea id="edit-notes" value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                data-testid="input-edit-notes" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-capacity">Capacity</Label>
                              <Input id="edit-capacity" type="number" value={editCapacity}
                                onChange={(e) => setEditCapacity(e.target.value)}
                                data-testid="input-edit-capacity" />
                            </div>
                            <Button onClick={() => updateEventMutation.mutate({
                              title: editTitle,
                              notes: editNotes,
                              capacity: Number(editCapacity),
                            })} disabled={updateEventMutation.isPending}
                              data-testid="button-save-edit">
                              {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                )}

                {/* RSVP Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">RSVP Summary</CardTitle>
                    <CardDescription>Current attendance overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CapacityBar current={joinedCount} total={event.capacity} />
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confirmed</span>
                        <span className="font-medium">{joinedCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Waitlisted</span>
                        <span className="font-medium">{waitlistedCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacity</span>
                        <span className="font-medium">{event.capacity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Spots remaining</span>
                        <span className="font-medium">{Math.max(0, event.capacity - joinedCount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Poll Results */}
                {detailedPolls && detailedPolls.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Vote className="h-4 w-4" />Poll Results
                      </CardTitle>
                      <CardDescription>Current vote standings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {detailedPolls.map((poll) => {
                        const sorted = [...(poll.options ?? [])].sort((a, b) => b.voteCount - a.voteCount);
                        const total = sorted.reduce((s, o) => s + o.voteCount, 0);
                        return (
                          <div key={poll.id}>
                            <p className="text-sm font-medium capitalize mb-2">{poll.type} Poll</p>
                            {sorted.slice(0, 5).map((opt) => {
                              const label = opt.course?.name ?? opt.dateOption ?? opt.label ?? "Option";
                              const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
                              return (
                                <div key={opt.id} className="mb-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground truncate max-w-[70%]">{label}</span>
                                    <span>{opt.voteCount} vote{opt.voteCount !== 1 ? "s" : ""} ({pct}%)</span>
                                  </div>
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Send Update */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Send className="h-4 w-4" />Send Update
                    </CardTitle>
                    <CardDescription>Email a message to all confirmed players</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Dialog open={sendUpdateDialogOpen} onOpenChange={setSendUpdateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" data-testid="button-send-update">
                          <Mail className="h-4 w-4 mr-2" />Compose Update
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Send Update</DialogTitle>
                          <DialogDescription>
                            This message will be sent to all {joinedCount} confirmed players.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            value={sendUpdateMsg}
                            onChange={(e) => setSendUpdateMsg(e.target.value)}
                            placeholder="Write your message here..."
                            rows={4}
                            data-testid="input-update-message"
                          />
                          <Button
                            onClick={() => sendUpdateMutation.mutate(sendUpdateMsg)}
                            disabled={sendUpdateMutation.isPending || !sendUpdateMsg.trim()}
                            data-testid="button-confirm-send-update"
                          >
                            {sendUpdateMutation.isPending ? "Sending..." : "Send Update"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                {/* Co-organizer Management (owner only) */}
                {isOwner && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />Co-organizers
                      </CardTitle>
                      <CardDescription>Promote members to help organize this event</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(event.members ?? [])
                        .filter(m => m.userId !== event.createdBy)
                        .map((member) => (
                          <div key={member.userId} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="text-xs">{initials(member.user?.name ?? "?")}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate">{member.user?.name}</span>
                            </div>
                            <Select
                              value={member.role}
                              onValueChange={(role) => updateRoleMutation.mutate({ userId: member.userId, role })}
                            >
                              <SelectTrigger className="w-32 shrink-0" data-testid={`role-select-${member.userId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="organizer">Organizer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      {(event.members ?? []).filter(m => m.userId !== event.createdBy).length === 0 && (
                        <p className="text-sm text-muted-foreground">No other members in this group.</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Pending Invitations */}
                {invitations && invitations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4" />Pending Invitations
                      </CardTitle>
                      <CardDescription>{invitations.filter(i => !i.acceptedAt).length} awaiting acceptance</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground truncate">{inv.email}</span>
                          {inv.acceptedAt ? (
                            <Badge variant="default" className="text-xs shrink-0">Accepted</Badge>
                          ) : new Date(inv.expiresAt) < new Date() ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Expired</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
