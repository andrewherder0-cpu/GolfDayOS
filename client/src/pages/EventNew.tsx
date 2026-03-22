import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { useAuthContext } from "@/lib/AuthProvider";
import type { Event, Group, Membership, User } from "@shared/schema";

interface GroupWithMembers extends Group {
  members: (Membership & { user: User })[];
}

const GAME_TYPES = ["Scramble", "Match Play", "Stroke Play", "Skins"] as const;
const TEAM_SIZES = [1, 2, 3, 4] as const;

export default function EventNew() {
  const [, params] = useRoute("/groups/:groupId/events/new");
  const groupId = params?.groupId;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuthContext();

  const [formData, setFormData] = useState({
    title: "",
    capacity: 16,
    notes: "",
    gameType: "" as string,
    teamSize: "" as string,
  });

  const { data: group } = useQuery<GroupWithMembers>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  // Redirect plain members — only owners and organizers can create events
  useEffect(() => {
    if (!group || !currentUser) return;
    const membership = group.members?.find(m => m.userId === currentUser.id);
    const isOwner = group.ownerId === currentUser.id;
    const isOrg = membership?.role === "organizer";
    if (membership && !isOwner && !isOrg) {
      toast({ title: "Access denied", description: "Only organizers can create events.", variant: "destructive" });
      setLocation(`/groups/${groupId}`);
    }
  }, [group, currentUser]);

  const createMutation = useMutation({
    mutationFn: (data: {
      groupId: string;
      title: string;
      capacity: number;
      notes?: string;
      gameType?: string;
      teamSize?: number;
    }) => {
      return apiRequest<Event>("POST", "/api/events", data);
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
      toast({ title: "Event created successfully!" });
      setLocation(`/events/${event.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    createMutation.mutate({
      groupId,
      title: formData.title,
      capacity: formData.capacity,
      notes: formData.notes || undefined,
      gameType: formData.gameType || undefined,
      teamSize: formData.teamSize ? parseInt(formData.teamSize) : undefined,
    });
  };

  if (!group) return null;

  return (
    <main className="max-w-2xl mx-auto p-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: group.name, href: `/groups/${groupId}` },
            { label: "New Event" },
          ]}
        />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Create New Event</CardTitle>
            <CardDescription>Set up a new golf event for your group</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title*</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Summer Golf Outing 2024"
                  required
                  data-testid="input-event-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Player Capacity*</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  required
                  data-testid="input-capacity"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of players (typically 16-20 for 4 foursomes)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="game-type">Game Type</Label>
                  <Select
                    value={formData.gameType}
                    onValueChange={(value) => setFormData({ ...formData, gameType: value })}
                  >
                    <SelectTrigger id="game-type" data-testid="select-game-type">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {GAME_TYPES.map((type) => (
                        <SelectItem key={type} value={type} data-testid={`option-game-type-${type}`}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-size">Team Size</Label>
                  <Select
                    value={formData.teamSize}
                    onValueChange={(value) => setFormData({ ...formData, teamSize: value })}
                  >
                    <SelectTrigger id="team-size" data-testid="select-team-size">
                      <SelectValue placeholder="Players per team" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)} data-testid={`option-team-size-${size}`}>
                          {size} {size === 1 ? "player" : "players"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">1–4 players per team</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Description (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional details about the event..."
                  rows={4}
                  data-testid="input-notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-create-event"
                >
                  {createMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
                <Link href={`/groups/${groupId}`}>
                  <a>
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </a>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
    </main>
  );
}
