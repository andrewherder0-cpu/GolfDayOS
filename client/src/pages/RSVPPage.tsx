import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CapacityBar } from "@/components/CapacityBar";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Clock, Users, Calendar, MapPin } from "lucide-react";
import type { Event, Group, Rsvp, User, Course } from "@shared/schema";

interface RsvpWithUser extends Rsvp {
  user: User;
}

interface EventWithRsvps extends Event {
  group: Group;
  course?: Course;
  rsvps: RsvpWithUser[];
}

export default function RSVPPage() {
  const [, params] = useRoute("/events/:id/rsvp");
  const eventId = params?.id;
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: event, isLoading } = useQuery<EventWithRsvps>({
    queryKey: ["/api/rsvps/event", eventId],
    enabled: !!eventId,
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/rsvps/event/${eventId}/join`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rsvps/event", eventId] });
      toast({ title: "RSVP confirmed!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/rsvps/event/${eventId}/withdraw`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rsvps/event", eventId] });
      toast({ title: "RSVP withdrawn" });
    },
  });

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/rsvps/event/${eventId}/claim`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rsvps/event", eventId] });
      toast({ title: "Spot claimed!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to claim", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading || !event) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <Skeleton className="h-96" />
      </main>
    );
  }

  const joinedRsvps = event.rsvps.filter((r) => r.status === "joined");
  const waitlistedRsvps = event.rsvps.filter((r) => r.status === "waitlisted");
  const userRsvp = event.rsvps.find((r) => r.userId === user?.id);

  const canClaim =
    userRsvp?.status === "waitlisted" &&
    userRsvp.claimedExpiresAt &&
    new Date(userRsvp.claimedExpiresAt) > new Date();

  return (
    <main className="max-w-4xl mx-auto p-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: event.group.name, href: `/groups/${event.groupId}` },
            { label: event.title, href: `/events/${eventId}` },
            { label: "RSVP" },
          ]}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">RSVP</h1>
          <p className="text-muted-foreground">Confirm your attendance for this event</p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{event.title}</CardTitle>
              <CardDescription>{event.group.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.course && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-course">{event.course.name}</span>
                </div>
              )}
              {event.chosenDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-date">
                    {new Date(event.chosenDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
              <CapacityBar current={joinedRsvps.length} total={event.capacity} />
            </CardContent>
          </Card>

          {/* User RSVP Status */}
          {userRsvp ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
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
                    <Button
                      variant="outline"
                      onClick={() => withdrawMutation.mutate()}
                      disabled={withdrawMutation.isPending}
                      data-testid="button-withdraw"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Withdraw
                    </Button>
                  </>
                )}
                {userRsvp.status === "waitlisted" && (
                  <>
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription data-testid="text-waitlisted-message">
                        You're #{userRsvp.positionInt} on the waitlist
                        {canClaim && " - A spot is available for you to claim!"}
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      {canClaim && (
                        <Button
                          onClick={() => claimMutation.mutate()}
                          disabled={claimMutation.isPending}
                          data-testid="button-claim"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Claim Spot (24h window)
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => withdrawMutation.mutate()}
                        disabled={withdrawMutation.isPending}
                        data-testid="button-withdraw-waitlist"
                      >
                        Leave Waitlist
                      </Button>
                    </div>
                  </>
                )}
                {userRsvp.status === "withdrawn" && (
                  <Alert>
                    <AlertDescription data-testid="text-withdrawn-message">
                      You've withdrawn from this event
                    </AlertDescription>
                  </Alert>
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
                    : "Join the waitlist to be notified if spots open up"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending}
                  data-testid="button-join"
                >
                  {joinMutation.isPending ? "Joining..." : "Join Event"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Roster */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Player Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {joinedRsvps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Confirmed ({joinedRsvps.length})</h4>
                    <div className="space-y-2">
                      {joinedRsvps.map((rsvp) => (
                        <div
                          key={rsvp.id}
                          className="flex items-center justify-between py-2 px-3 border rounded-lg"
                          data-testid={`player-${rsvp.userId}`}
                        >
                          <div>
                            <p className="text-sm font-medium">{rsvp.user.name}</p>
                            <p className="text-xs text-muted-foreground">{rsvp.user.email}</p>
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
                        <div
                          key={rsvp.id}
                          className="flex items-center justify-between py-2 px-3 border rounded-lg bg-muted/30"
                          data-testid={`waitlist-${rsvp.userId}`}
                        >
                          <div>
                            <p className="text-sm font-medium">{rsvp.user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Position #{rsvp.positionInt}
                            </p>
                          </div>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Link href={`/events/${eventId}`}>
            <a>
              <Button variant="outline" data-testid="button-back">
                Back to Event
              </Button>
            </a>
          </Link>
        </div>
    </main>
  );
}
