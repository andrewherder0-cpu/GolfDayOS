import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { CapacityBar } from "@/components/CapacityBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, MapPin, Users, Vote, CheckCircle2, MessageSquare, Map, ChevronDown, ChevronUp } from "lucide-react";
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
  const [mapOpen, setMapOpen] = useState(false);

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

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Info */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-semibold mb-2" data-testid="text-event-title">
                    {event.title}
                  </h1>
                  <Link href={`/groups/${event.groupId}`}>
                    <a className="text-muted-foreground hover:text-foreground">
                      {event.group.name}
                    </a>
                  </Link>
                </div>
                <StatusBadge status={event.state} />
              </div>

              {event.notes && (
                <p className="text-muted-foreground mb-6" data-testid="text-event-notes">
                  {event.notes}
                </p>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
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
              </div>

              {/* Actions */}
              {isOwner && (
                <div className="space-y-3 pt-6 border-t">
                  <h3 className="text-sm font-medium">Event Management</h3>
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
                              id="coursePoll"
                              checked={createCoursePoll}
                              onCheckedChange={(checked) => setCreateCoursePoll(checked as boolean)}
                              data-testid="checkbox-course-poll"
                            />
                            <Label htmlFor="coursePoll" className="cursor-pointer">
                              Create Course Poll
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="datePoll"
                              checked={createDatePoll}
                              onCheckedChange={(checked) => setCreateDatePoll(checked as boolean)}
                              data-testid="checkbox-date-poll"
                            />
                            <Label htmlFor="datePoll" className="cursor-pointer">
                              Create Date Poll
                            </Label>
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
                    <>
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
                    </>
                  )}
                  {event.state === "rsvp" && (
                    <Button
                      onClick={() => finalizeMutation.mutate()}
                      disabled={finalizeMutation.isPending}
                      data-testid="button-finalize"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Finalize Event
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
                </div>
              )}
            </Card>

            {/* Polls Section */}
            {event.state === "polling" && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Active Polls</CardTitle>
                  <CardDescription>Vote on the course and date for this event</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/events/${eventId}/polls`}>
                    <a>
                      <Button data-testid="button-go-to-polls">View & Vote</Button>
                    </a>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* RSVP Section */}
            {(event.state === "rsvp" || event.state === "final" || event.state === "closed") && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>RSVP</CardTitle>
                  <CardDescription>Manage your attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/events/${eventId}/rsvp`}>
                    <a>
                      <Button data-testid="button-go-to-rsvp">View RSVP Details</Button>
                    </a>
                  </Link>
                </CardContent>
              </Card>
            )}
          {/* Course Map */}
          {(event.state === "draft" || event.state === "polling") && (
            <Card className="mt-6">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between gap-1 pb-3"
                onClick={() => setMapOpen(o => !o)}
                data-testid="button-toggle-map"
              >
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Map className="h-4 w-4" />
                    GTA Course Map
                  </CardTitle>
                  <CardDescription className="mt-0.5">Browse local courses and add them to the course poll</CardDescription>
                </div>
                {mapOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </CardHeader>
              {mapOpen && (
                <CardContent>
                  <CourseMapView
                    coursePoll={event.polls?.find(p => p.type === "course")}
                    isOrganizer={isOwner}
                    eventId={event.id}
                  />
                </CardContent>
              )}
            </Card>
          )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CapacityBar current={joinedCount} total={event.capacity} />
                {waitlistedCount > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground" data-testid="text-waitlist-count">
                    {waitlistedCount} on waitlist
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="flex flex-col" style={{ height: "420px" }}>
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Group Chat
                </CardTitle>
                <CardDescription>Chat with your group about this event</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 min-h-0">
                <ChatView eventId={event.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
