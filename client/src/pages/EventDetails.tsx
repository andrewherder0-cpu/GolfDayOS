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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar, MapPin, Users, Vote, CheckCircle2, MessageSquare, Map,
  ClipboardList, Settings, UserCog, Send, Mail, Crown, Shield, Clock, XCircle, UserCheck, Plus, Trash2, ChevronsUpDown,
} from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Event, Group, Course, Poll, Rsvp, User, Membership } from "@shared/schema";
import { ChatView } from "@/components/ChatView";
import { CourseMapView } from "@/components/CourseMapView";

function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "An unexpected error occurred";
}

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

interface PollOption {
  id: string;
  label?: string;
  courseId?: string;
  dateOption?: string;
  voteCount: number;
  course?: Course;
}

interface PollWithOptions extends Poll {
  options: PollOption[];
  userVote?: string;
}

interface EventPollsResponse {
  polls: PollWithOptions[];
  [key: string]: unknown;
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

  const [newDateInputs, setNewDateInputs] = useState<Record<string, string>>({});
  const [selectedCourseIds, setSelectedCourseIds] = useState<Record<string, string>>({});
  const [selectedCourseLabels, setSelectedCourseLabels] = useState<Record<string, string>>({});
  const [coursePickerOpen, setCoursePickerOpen] = useState<Record<string, boolean>>({});

  const { data: event, isLoading } = useQuery<EventWithDetails>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: eventPollsData } = useQuery<EventPollsResponse>({
    queryKey: ["/api/polls/event", eventId],
    enabled: !!eventId,
  });
  const detailedPolls = eventPollsData?.polls;

  const { data: allCourses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    enabled: !!eventId,
  });

  const canViewInvitations = !!event && (
    event.membership?.role === "owner" ||
    event.membership?.role === "organizer"
  );

  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: ["/api/groups", event?.groupId, "invitations"],
    enabled: canViewInvitations,
  });

  const openPollsMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/events/${eventId}/polls/open`, { createCoursePoll, createDatePoll }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Polls opened successfully!" });
      setPollDialogOpen(false);
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const openRsvpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/rsvp/open`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "RSVP period opened!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/finalize`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Event finalized!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const updateEventMutation = useMutation({
    mutationFn: (data: { title?: string; notes?: string; capacity?: number }) =>
      apiRequest("PATCH", `/api/events/${eventId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Event updated!" });
      setEditDialogOpen(false);
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const joinRsvpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/rsvps/event/${eventId}/join`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "RSVP confirmed!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const withdrawRsvpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/rsvps/event/${eventId}/withdraw`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "RSVP withdrawn" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const claimRsvpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/rsvps/event/${eventId}/claim`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Spot claimed!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
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
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiRequest("PATCH", `/api/groups/${event?.groupId}/members/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Role updated!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const applyPollOptionMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/apply-result`, { winningOptionId: optionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Poll result applied!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const addDateOptionMutation = useMutation({
    mutationFn: ({ pollId, dateOption }: { pollId: string; dateOption: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/options`, { dateOption }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      setNewDateInputs(prev => ({ ...prev, [variables.pollId]: "" }));
      toast({ title: "Date suggested!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const addCourseOptionMutation = useMutation({
    mutationFn: ({ pollId, courseId }: { pollId: string; courseId: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/options`, { courseId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      setSelectedCourseIds(prev => ({ ...prev, [variables.pollId]: "" }));
      setSelectedCourseLabels(prev => ({ ...prev, [variables.pollId]: "" }));
      toast({ title: "Course added to poll!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
  });

  const deletePollMutation = useMutation({
    mutationFn: (pollId: string) => apiRequest("DELETE", `/api/polls/${pollId}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Poll deleted" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" }),
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

  const isOwner = event.membership?.role === "owner";
  const isOrganizer = isOwner || event.createdBy === user?.id || event.membership?.role === "organizer";
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
    const rsvp = event!.rsvps.find(r => r.userId === userId);
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
            {event.state === "polling" ? (() => {
              const todayStr = new Date().toISOString().split("T")[0];
              return (
                <div className="space-y-4">
                  {(detailedPolls ?? []).map((poll) => {
                    const isDate = poll.type === "date";
                    const sorted = [...(poll.options ?? [])].sort((a, b) => b.voteCount - a.voteCount);
                    const total = sorted.reduce((s, o) => s + o.voteCount, 0);
                    const alreadyAddedCourseIds = new Set(
                      (poll.options ?? []).map((o: PollOption) => o.courseId).filter(Boolean)
                    );
                    const availableCourses = allCourses.filter(c => !alreadyAddedCourseIds.has(c.id));
                    return (
                      <Card key={poll.id} data-testid={`card-poll-tab-${poll.type}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                              {isDate ? <Calendar className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                              {isDate ? "Date Poll" : "Course Poll"}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">{poll.visibility}</Badge>
                              <Link href={`/events/${eventId}/polls`}>
                                <a>
                                  <Button size="sm" variant="outline" data-testid={`button-vote-${poll.type}`}>
                                    <Vote className="h-3 w-3 mr-1" />Vote
                                  </Button>
                                </a>
                              </Link>
                              {isOrganizer && poll.visibility === "live" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (confirm("Delete this poll and all its votes?")) {
                                      deletePollMutation.mutate(poll.id);
                                    }
                                  }}
                                  disabled={deletePollMutation.isPending}
                                  data-testid={`button-delete-poll-tab-${poll.type}`}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />Delete
                                </Button>
                              )}
                            </div>
                          </div>
                          <CardDescription>
                            {sorted.length} option{sorted.length !== 1 ? "s" : ""} · {total} vote{total !== 1 ? "s" : ""} cast
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Suggest a date (all members, date poll only) */}
                          {isDate && poll.visibility === "live" && (
                            <div className="flex gap-2 items-center p-3 bg-muted/40 rounded-md">
                              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                              <Input
                                type="date"
                                min={todayStr}
                                value={newDateInputs[poll.id] || ""}
                                onChange={(e) => setNewDateInputs(prev => ({ ...prev, [poll.id]: e.target.value }))}
                                className="flex-1"
                                data-testid={`input-suggest-date-${poll.id}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (newDateInputs[poll.id]) {
                                    addDateOptionMutation.mutate({ pollId: poll.id, dateOption: newDateInputs[poll.id] });
                                  }
                                }}
                                disabled={!newDateInputs[poll.id] || addDateOptionMutation.isPending}
                                data-testid={`button-suggest-date-${poll.id}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />Suggest
                              </Button>
                            </div>
                          )}

                          {/* Add course option (organizer only, course poll only) — searchable combobox */}
                          {!isDate && poll.visibility === "live" && isOrganizer && (
                            <div className="flex gap-2 items-center p-3 bg-muted/40 rounded-md">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <Popover
                                open={coursePickerOpen[poll.id] ?? false}
                                onOpenChange={(open) => setCoursePickerOpen(prev => ({ ...prev, [poll.id]: open }))}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="flex-1 justify-between font-normal"
                                    data-testid={`button-course-picker-tab-${poll.id}`}
                                  >
                                    <span className={selectedCourseLabels[poll.id] ? "" : "text-muted-foreground"}>
                                      {selectedCourseLabels[poll.id] || "Search for a course..."}
                                    </span>
                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search courses..." />
                                    <CommandList>
                                      <CommandEmpty>No courses found.</CommandEmpty>
                                      {availableCourses.map(course => (
                                        <CommandItem
                                          key={course.id}
                                          value={`${course.name} ${course.city ?? ""}`}
                                          onSelect={() => {
                                            setSelectedCourseIds(prev => ({ ...prev, [poll.id]: course.id }));
                                            setSelectedCourseLabels(prev => ({ ...prev, [poll.id]: `${course.name}${course.city ? ` — ${course.city}` : ""}` }));
                                            setCoursePickerOpen(prev => ({ ...prev, [poll.id]: false }));
                                          }}
                                          data-testid={`course-option-tab-${course.id}`}
                                        >
                                          <div>
                                            <p className="text-sm font-medium">{course.name}</p>
                                            {course.city && <p className="text-xs text-muted-foreground">{course.city}, {course.region}</p>}
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const courseId = selectedCourseIds[poll.id];
                                  if (courseId) {
                                    addCourseOptionMutation.mutate({ pollId: poll.id, courseId });
                                  }
                                }}
                                disabled={!selectedCourseIds[poll.id] || addCourseOptionMutation.isPending}
                                data-testid={`button-add-course-tab-${poll.id}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />Add
                              </Button>
                            </div>
                          )}

                          {sorted.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-3">
                              {isDate
                                ? "No dates suggested yet — use the picker above."
                                : isOrganizer
                                  ? "Use the dropdown above to add courses to this poll."
                                  : "No courses added yet."}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {sorted.map((opt, idx) => {
                                const label = opt.label ?? opt.course?.name ?? opt.dateOption ?? "Option";
                                const sub = !isDate && opt.course ? `${opt.course.city}, ${opt.course.region}` : null;
                                const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
                                const isLeading = idx === 0 && opt.voteCount > 0;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`border rounded-md p-3 ${isLeading ? "border-primary/50 bg-primary/5" : ""}`}
                                    data-testid={`poll-option-${opt.id}`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{label}</p>
                                        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                                        <div className="mt-2">
                                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>{opt.voteCount} vote{opt.voteCount !== 1 ? "s" : ""}</span>
                                            <span>{pct}%</span>
                                          </div>
                                          <Progress value={pct} className="h-1.5" />
                                        </div>
                                      </div>
                                      {isOrganizer && poll.visibility === "live" && (
                                        <Button
                                          size="sm"
                                          variant={isLeading ? "default" : "outline"}
                                          onClick={() => applyPollOptionMutation.mutate({ pollId: poll.id, optionId: opt.id })}
                                          disabled={applyPollOptionMutation.isPending}
                                          data-testid={`button-pick-${opt.id}`}
                                          className="shrink-0"
                                        >
                                          <CheckCircle2 className="h-3 w-3 mr-1" />Pick This
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {(!detailedPolls || detailedPolls.length === 0) && (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Vote className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading poll data...</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })() : event.state === "draft" ? (
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
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-600" />
                  <p className="text-sm font-medium mb-2">Polling complete</p>
                  {event.course && (
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span><strong>{event.course.name}</strong></span>
                    </div>
                  )}
                  {event.chosenDate && (
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span><strong>{new Date(event.chosenDate).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* RSVP TAB */}
          <TabsContent value="rsvp">
            {event.state === "rsvp" || event.state === "final" || event.state === "closed" ? (() => {
              const joinedRsvps = event.rsvps.filter(r => r.status === "joined");
              const waitlistedRsvps = event.rsvps.filter(r => r.status === "waitlisted");
              const userRsvp = event.rsvps.find(r => r.userId === user?.id);
              const canClaim = userRsvp?.status === "waitlisted" && userRsvp.claimedExpiresAt && new Date(userRsvp.claimedExpiresAt) > new Date();

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {/* User status + join/withdraw */}
                    {userRsvp ? (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="text-lg">Your RSVP</CardTitle>
                            <StatusBadge status={userRsvp.status} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {userRsvp.status === "joined" && (
                            <>
                              <Alert>
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription data-testid="text-joined-message">
                                  You're confirmed for this event!
                                </AlertDescription>
                              </Alert>
                              {event.state !== "closed" && (
                                <Button variant="outline" onClick={() => withdrawRsvpMutation.mutate()}
                                  disabled={withdrawRsvpMutation.isPending} data-testid="button-withdraw">
                                  <XCircle className="h-4 w-4 mr-2" />Withdraw
                                </Button>
                              )}
                            </>
                          )}
                          {userRsvp.status === "waitlisted" && (
                            <>
                              <Alert>
                                <Clock className="h-4 w-4" />
                                <AlertDescription data-testid="text-waitlisted-message">
                                  You're #{userRsvp.positionInt} on the waitlist
                                  {canClaim && " — A spot is available for you to claim!"}
                                </AlertDescription>
                              </Alert>
                              <div className="flex gap-2 flex-wrap">
                                {canClaim && (
                                  <Button onClick={() => claimRsvpMutation.mutate()}
                                    disabled={claimRsvpMutation.isPending} data-testid="button-claim">
                                    <CheckCircle2 className="h-4 w-4 mr-2" />Claim Spot
                                  </Button>
                                )}
                                <Button variant="outline" onClick={() => withdrawRsvpMutation.mutate()}
                                  disabled={withdrawRsvpMutation.isPending} data-testid="button-withdraw-waitlist">
                                  Leave Waitlist
                                </Button>
                              </div>
                            </>
                          )}
                          {userRsvp.status === "withdrawn" && (
                            <Alert>
                              <AlertDescription data-testid="text-withdrawn-message">
                                You've withdrawn. You can rejoin if spots are available.
                              </AlertDescription>
                            </Alert>
                          )}
                          {userRsvp.status === "withdrawn" && event.state !== "closed" && (
                            <Button onClick={() => joinRsvpMutation.mutate()}
                              disabled={joinRsvpMutation.isPending} data-testid="button-join">
                              {joinRsvpMutation.isPending ? "Joining..." : "Rejoin Event"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Join This Event</CardTitle>
                          <CardDescription>
                            {joinedRsvps.length < event.capacity
                              ? "Spots are available!"
                              : "Join the waitlist to be notified if a spot opens up"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button onClick={() => joinRsvpMutation.mutate()}
                            disabled={joinRsvpMutation.isPending} data-testid="button-join">
                            {joinRsvpMutation.isPending ? "Joining..." : "Join Event"}
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Roster */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />Player Roster
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {joinedRsvps.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Confirmed ({joinedRsvps.length})</h4>
                            <div className="space-y-2">
                              {joinedRsvps.map((rsvp) => (
                                <div key={rsvp.id} className="flex items-center justify-between py-2 px-3 border rounded-md"
                                  data-testid={`rsvp-player-${rsvp.userId}`}>
                                  <div>
                                    <p className="text-sm font-medium">{rsvp.user?.name}</p>
                                    <p className="text-xs text-muted-foreground">{rsvp.user?.email}</p>
                                  </div>
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {waitlistedRsvps.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Waitlist ({waitlistedRsvps.length})</h4>
                            <div className="space-y-2">
                              {waitlistedRsvps.map((rsvp) => (
                                <div key={rsvp.id} className="flex items-center justify-between py-2 px-3 border rounded-md bg-muted/30"
                                  data-testid={`rsvp-waitlist-${rsvp.userId}`}>
                                  <div>
                                    <p className="text-sm font-medium">{rsvp.user?.name}</p>
                                    <p className="text-xs text-muted-foreground">Position #{rsvp.positionInt}</p>
                                  </div>
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {joinedRsvps.length === 0 && waitlistedRsvps.length === 0 && (
                          <p className="text-sm text-muted-foreground">No players have RSVPed yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Attendance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CapacityBar current={joinedCount} total={event.capacity} />
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <div className="flex justify-between"><span>Confirmed</span><span>{joinedCount}</span></div>
                          {waitlistedCount > 0 && (
                            <div className="flex justify-between"><span>Waitlisted</span><span data-testid="text-waitlist-count">{waitlistedCount}</span></div>
                          )}
                          <div className="flex justify-between"><span>Capacity</span><span>{event.capacity}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                    {event.state === "final" && isOrganizer && (
                      <Card>
                        <CardContent className="pt-4">
                          <Link href={`/events/${eventId}/pairings`}>
                            <a>
                              <Button className="w-full" variant="outline" data-testid="button-manage-pairings">
                                <Users className="h-4 w-4 mr-2" />Manage Pairings
                              </Button>
                            </a>
                          </Link>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              );
            })() : (
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
                    const isCreator = member.role === "owner";
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
                          {!isCreator && member.role === "member" && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <UserCheck className="h-3 w-3" />Member
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
                {event.id ? (
                  <CourseMapView coursePoll={coursePoll} isOrganizer={isOrganizer} eventId={event.id} />
                ) : (
                  <Alert><AlertDescription>Course map is not available at this time.</AlertDescription></Alert>
                )}
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
                {event.id ? (
                  <ChatView eventId={event.id} />
                ) : (
                  <Alert><AlertDescription>Chat is not available at this time.</AlertDescription></Alert>
                )}
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
                        <span className="text-muted-foreground">Withdrawn</span>
                        <span className="font-medium">{event.rsvps.filter(r => r.status === "withdrawn").length}</span>
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
                {canViewInvitations && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4" />Pending Invitations
                      </CardTitle>
                      <CardDescription>
                        {invitations ? `${invitations.filter(i => !i.acceptedAt).length} awaiting acceptance` : "Loading..."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {invitations && invitations.length > 0 ? (
                        invitations.map((inv) => (
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
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No invitations sent yet.</p>
                      )}
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
