import { useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import type { Event, Group } from "@shared/schema";

export default function EventNew() {
  const [, params] = useRoute("/groups/:groupId/events/new");
  const groupId = params?.groupId;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    capacity: 16,
    notes: "",
  });

  const { data: group } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { groupId: string; title: string; capacity: number; notes?: string }) => {
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
      ...formData,
    });
  };

  if (!group) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
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

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
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
    </div>
  );
}
