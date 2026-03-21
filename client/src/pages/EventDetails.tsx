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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, MapPin, Users, Vote, CheckCircle2, MessageSquare, Map, ClipboardList, Settings } from "lucide-react";
import { useState } from "react";
import type { Event, Group, Course, Poll, Rsvp, User } from "@shared/schema";
import { ChatView } from "@/components/ChatView";
import { CourseMapView } from "@/components/CourseMapView";

interface EventWithDetails extends Event {
  group: Group;
  course?: Course;
  polls: Poll[];
  rsvps: (Rsvp & { user: User })[];
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

  const { data: event, isLoading } = useQuery<EventWithDetails>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const openPollsMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/events/${eventId}/polls/open`, {
        createCoursePoll,
        createDatePoll,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Polls opened successfully!" });
      setPollDialogOpen(false);
    },
  });

  const openRsvpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/rsvp/open`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "RSVP period opened!" });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/finalize`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Event finalized!" });
    },
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
  const joinedCount = event.rsvps.filter((r) => r.status === "joined").length;
  const waitlistedCount = event.rsvps.filter((r) => r.status === "waitlisted").length;
  const coursePoll = event.polls?.find(p => p.type === "course");
  const datePoll = event.polls?.find(p => p.type === "date");

  const defaultTab = event.state === "polling" ? "polls"
    : event.state === "rsvp" ? "rsvp"
    : event.state === "final" || event.state === "closed" ? "rsvp"
    : "overview";

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

        {/* Event Header */}
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
          <TabsList className="mb-6" data-testid="event-tabs">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <ClipboardList className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="polls" data-testid="tab-polls">
              <Vote className="h-4 w-4 mr-2" />
              Polls
            </TabsTrigger>
            <TabsTrigger value="rsvp" data-testid="tab-rsvp">
              <Users className="h-4 w-4 mr-2" />
              RSVP
            </TabsTrigger>
            <TabsTrigger value="map" data-testid="tab-map">
              <Map className="h-4 w-4 mr-2" />
              Course Map
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="organizer" data-testid="tab-organizer">
                <Settings className="h-4 w-4 mr-2" />
                Organizer
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
                      <p className="text-muted-foreground" data-testid="text-event-notes">
                        {event.notes}
                      </p>
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
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
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

                {/* Status summary */}
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

              {/* Sidebar: quick actions */}
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
                            <Vote className="h-4 w-4 mr-2" />
                            View &amp; Vote on Polls
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
                  {isOwner && (
                    <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-open-polls">Open Polls</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Open Polls</DialogTitle>
                          <DialogDescription>
                            Create polls for group members to vote on course and date
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="coursePoll"
                              checked={createCoursePoll}
                              onCheckedChange={(checked) => setCreateCoursePoll(checked as boolean)}
                              data-testid="checkbox-course-poll"
                            />
                            <Label htmlFor="coursePoll" className="cursor-pointer">Create Course Poll</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="datePoll"
                              checked={createDatePoll}
                              onCheckedChange={(checked) => setCreateDatePoll(checked as boolean)}
                              data-testid="checkbox-date-poll"
                            />
                            <Label htmlFor="datePoll" className="cursor-pointer">Create Date Poll</Label>
                          </div>
                          <Button
                            onClick={() => openPollsMutation.mutate()}
                            disabled={openPollsMutation.isPending || (!createCoursePoll && !createDatePoll)}
                            data-testid="button-confirm-open-polls"
                          >
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
                    <p className="text-sm mt-1">
                      Chosen date: <strong>{new Date(event.chosenDate).toLocaleDateString()}</strong>
                    </p>
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
                        <Users className="h-4 w-4 mr-2" />
                        View Full RSVP List
                      </Button>
                    </a>
                  </Link>
                  {event.state === "final" && isOwner && (
                    <div className="pt-2">
                      <Link href={`/events/${eventId}/pairings`}>
                        <a>
                          <Button variant="outline" data-testid="button-manage-pairings">
                            <Users className="h-4 w-4 mr-2" />
                            Manage Pairings
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
                  <p className="text-sm text-muted-foreground">
                    RSVP opens after polling is complete.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MAP TAB */}
          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  GTA Course Map
                </CardTitle>
                <CardDescription>Browse local courses and add them to the course poll</CardDescription>
              </CardHeader>
              <CardContent>
                <CourseMapView
                  coursePoll={coursePoll}
                  isOrganizer={isOwner}
                  eventId={event.id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHAT TAB */}
          <TabsContent value="chat">
            <Card className="flex flex-col" style={{ height: 520 }}>
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Group Chat
                </CardTitle>
                <CardDescription>Chat with your group about this event</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 min-h-0">
                <ChatView eventId={event.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ORGANIZER TAB (owner only) */}
          {isOwner && (
            <TabsContent value="organizer">
              <div className="space-y-4 max-w-lg">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Organizer Controls
                    </CardTitle>
                    <CardDescription>Manage the event lifecycle</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.state === "draft" && (
                      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-open-polls">
                            <Vote className="h-4 w-4 mr-2" />
                            Open Polls
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Open Polls</DialogTitle>
                            <DialogDescription>
                              Create polls for group members to vote on course and date
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="coursePoll2"
                                checked={createCoursePoll}
                                onCheckedChange={(checked) => setCreateCoursePoll(checked as boolean)}
                                data-testid="checkbox-course-poll"
                              />
                              <Label htmlFor="coursePoll2" className="cursor-pointer">Create Course Poll</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="datePoll2"
                                checked={createDatePoll}
                                onCheckedChange={(checked) => setCreateDatePoll(checked as boolean)}
                                data-testid="checkbox-date-poll"
                              />
                              <Label htmlFor="datePoll2" className="cursor-pointer">Create Date Poll</Label>
                            </div>
                            <Button
                              onClick={() => openPollsMutation.mutate()}
                              disabled={openPollsMutation.isPending || (!createCoursePoll && !createDatePoll)}
                              data-testid="button-confirm-open-polls"
                            >
                              {openPollsMutation.isPending ? "Opening..." : "Open Polls"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {event.state === "polling" && (
                      <div className="space-y-2">
                        <Button onClick={() => setLocation(`/events/${eventId}/polls`)} data-testid="button-view-polls">
                          <Vote className="h-4 w-4 mr-2" />
                          View Polls
                        </Button>
                        {event.chosenCourseId && event.chosenDate && (
                          <Button
                            onClick={() => openRsvpMutation.mutate()}
                            disabled={openRsvpMutation.isPending}
                            data-testid="button-open-rsvp"
                          >
                            Open RSVP
                          </Button>
                        )}
                      </div>
                    )}

                    {event.state === "rsvp" && (
                      <Button
                        onClick={() => finalizeMutation.mutate()}
                        disabled={finalizeMutation.isPending}
                        data-testid="button-finalize"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {finalizeMutation.isPending ? "Finalizing..." : "Finalize Event"}
                      </Button>
                    )}

                    {event.state === "final" && (
                      <Link href={`/events/${eventId}/pairings`}>
                        <a>
                          <Button data-testid="button-manage-pairings">
                            <Users className="h-4 w-4 mr-2" />
                            Manage Pairings
                          </Button>
                        </a>
                      </Link>
                    )}

                    {event.state === "closed" && (
                      <p className="text-sm text-muted-foreground">This event is closed.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
