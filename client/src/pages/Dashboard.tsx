import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Users, Calendar, MapPin, LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Group, Event } from "@shared/schema";

interface GroupWithDetails extends Group {
  memberCount: number;
  eventCount: number;
}

interface EventWithDetails extends Event {
  groupName: string;
  courseName?: string;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [joinCode, setJoinCode] = useState("");

  const { data: groups, isLoading: groupsLoading } = useQuery<GroupWithDetails[]>({
    queryKey: ["/api/groups/mine"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events/upcoming"],
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (code: string): Promise<{ id: string; name: string }> => {
      const res = await apiRequest("POST", `/api/groups/join/${code}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/mine"] });
      setJoinCode("");
      toast({ title: "Joined group!", description: `Welcome to ${data.name ?? "the group"}` });
      if (data.id) setLocation(`/groups/${data.id}`);
    },
    onError: (e: Error) => {
      toast({ title: "Could not join group", description: e.message, variant: "destructive" });
    },
  });

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length >= 4) joinGroupMutation.mutate(code);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground">Manage your groups and upcoming events</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Groups */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="text-xl font-semibold" data-testid="text-my-groups">My Groups</h2>
              <Link href="/groups/new">
                <a>
                  <Button size="sm" data-testid="button-new-group">
                    <Plus className="h-4 w-4 mr-1" />
                    New Group
                  </Button>
                </a>
              </Link>
            </div>

            {/* Join Group inline */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter join code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="font-mono tracking-wider"
                data-testid="input-join-code"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleJoin}
                disabled={joinCode.trim().length < 4 || joinGroupMutation.isPending}
                data-testid="button-join-group"
              >
                <LogIn className="h-4 w-4 mr-1" />
                {joinGroupMutation.isPending ? "Joining..." : "Join"}
              </Button>
            </div>

            <div className="space-y-3">
              {groupsLoading ? (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : groups && groups.length > 0 ? (
                groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <a>
                      <Card className="hover-elevate cursor-pointer" data-testid={`card-group-${group.id}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <CardDescription className="font-mono text-xs tracking-wider">
                            {group.joinCode}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{group.memberCount} members</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{group.eventCount} events</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  </Link>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">No groups yet</p>
                    <Link href="/groups/new">
                      <a>
                        <Button size="sm" data-testid="button-create-first-group">
                          Create your first group
                        </Button>
                      </a>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" data-testid="text-upcoming-events">Upcoming Events</h2>
              <Link href="/courses">
                <a>
                  <Button variant="outline" size="sm" data-testid="button-browse-courses">
                    <MapPin className="h-4 w-4 mr-1" />
                    Browse Courses
                  </Button>
                </a>
              </Link>
            </div>

            <div className="space-y-4">
              {eventsLoading ? (
                <>
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </>
              ) : events && events.length > 0 ? (
                events.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <a>
                      <Card className="hover-elevate cursor-pointer" data-testid={`card-event-${event.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg mb-1">{event.title}</CardTitle>
                              <CardDescription>{event.groupName}</CardDescription>
                            </div>
                            <StatusBadge status={event.state} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {event.courseName && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{event.courseName}</span>
                              </div>
                            )}
                            {event.chosenDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(event.chosenDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>Capacity: {event.capacity}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  </Link>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">No upcoming events</p>
                    <p className="text-xs text-muted-foreground">
                      Create an event from a group page
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
