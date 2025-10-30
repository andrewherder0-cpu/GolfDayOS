import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Plus, Trash2, ChevronUp, ChevronDown, FileText } from "lucide-react";
import type { Event, Group, Pairing, PairingMember, User, Rsvp } from "@shared/schema";

interface PairingWithMembers extends Pairing {
  members: (PairingMember & { user: User })[];
}

interface EventWithPairings extends Event {
  group: Group;
  pairings: PairingWithMembers[];
  availablePlayers: User[];
}

export default function Pairings() {
  const [, params] = useRoute("/events/:id/pairings");
  const eventId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newPairingOpen, setNewPairingOpen] = useState(false);
  const [pairingForm, setPairingForm] = useState({ name: "", teeTimeText: "" });

  const { data: event, isLoading } = useQuery<EventWithPairings>({
    queryKey: ["/api/pairings/event", eventId],
    enabled: !!eventId,
  });

  const createPairingMutation = useMutation({
    mutationFn: (data: { name: string; teeTimeText: string }) =>
      apiRequest<Pairing>("POST", `/api/pairings/event/${eventId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairings/event", eventId] });
      toast({ title: "Pairing created!" });
      setNewPairingOpen(false);
      setPairingForm({ name: "", teeTimeText: "" });
    },
  });

  const updatePairingMutation = useMutation({
    mutationFn: ({ pairingId, data }: { pairingId: string; data: { name?: string; teeTimeText?: string } }) =>
      apiRequest("PUT", `/api/pairings/${pairingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairings/event", eventId] });
      toast({ title: "Pairing updated!" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ pairingId, userId }: { pairingId: string; userId: string }) =>
      apiRequest("POST", `/api/pairings/${pairingId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairings/event", eventId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ pairingId, memberId }: { pairingId: string; memberId: string }) =>
      apiRequest("DELETE", `/api/pairings/${pairingId}/members/${memberId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairings/event", eventId] });
    },
  });

  const reorderMemberMutation = useMutation({
    mutationFn: ({ pairingId, memberId, direction }: { pairingId: string; memberId: string; direction: "up" | "down" }) =>
      apiRequest("POST", `/api/pairings/${pairingId}/members/${memberId}/reorder`, { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairings/event", eventId] });
    },
  });

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`/api/pairings/event/${eventId}/export/tee-sheet.pdf`, {
        credentials: "include",
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tee-sheet-${eventId}.pdf`;
      a.click();
      toast({ title: "Tee sheet downloaded!" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/api/pairings/event/${eventId}/export/roster.csv`, {
        credentials: "include",
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roster-${eventId}.csv`;
      a.click();
      toast({ title: "Roster downloaded!" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto p-8">
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto p-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: event.group.name, href: `/groups/${event.groupId}` },
            { label: event.title, href: `/events/${eventId}` },
            { label: "Pairings" },
          ]}
        />

        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Manage Pairings</h1>
              <p className="text-muted-foreground">Organize players into foursomes and set tee times</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
                <Download className="h-4 w-4 mr-2" />
                Tee Sheet PDF
              </Button>
              <Dialog open={newPairingOpen} onOpenChange={setNewPairingOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-pairing">
                    <Plus className="h-4 w-4 mr-2" />
                    New Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Pairing Group</DialogTitle>
                    <DialogDescription>Add a new foursome or group</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Group Name</Label>
                      <Input
                        id="name"
                        value={pairingForm.name}
                        onChange={(e) => setPairingForm({ ...pairingForm, name: e.target.value })}
                        placeholder="e.g., Group 1"
                        data-testid="input-pairing-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teeTime">Tee Time</Label>
                      <Input
                        id="teeTime"
                        value={pairingForm.teeTimeText}
                        onChange={(e) => setPairingForm({ ...pairingForm, teeTimeText: e.target.value })}
                        placeholder="e.g., 8:00 AM"
                        data-testid="input-tee-time"
                      />
                    </div>
                    <Button
                      onClick={() => createPairingMutation.mutate(pairingForm)}
                      disabled={createPairingMutation.isPending || !pairingForm.name}
                      data-testid="button-create-pairing"
                    >
                      {createPairingMutation.isPending ? "Creating..." : "Create Group"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {event.pairings.map((pairing) => (
              <Card key={pairing.id} className="p-4" data-testid={`card-pairing-${pairing.id}`}>
                <div className="space-y-4">
                  <div>
                    <Input
                      value={pairing.name}
                      onChange={(e) =>
                        updatePairingMutation.mutate({
                          pairingId: pairing.id,
                          data: { name: e.target.value },
                        })
                      }
                      className="font-medium"
                      data-testid={`input-pairing-name-${pairing.id}`}
                    />
                    <Input
                      value={pairing.teeTimeText || ""}
                      onChange={(e) =>
                        updatePairingMutation.mutate({
                          pairingId: pairing.id,
                          data: { teeTimeText: e.target.value },
                        })
                      }
                      placeholder="Tee time"
                      className="mt-2 text-sm"
                      data-testid={`input-tee-time-${pairing.id}`}
                    />
                  </div>

                  <div className="space-y-2">
                    {pairing.members
                      .sort((a, b) => a.orderInt - b.orderInt)
                      .map((member, index) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 border rounded-lg p-2"
                          data-testid={`member-${member.id}`}
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-4 w-4 p-0"
                              onClick={() =>
                                reorderMemberMutation.mutate({
                                  pairingId: pairing.id,
                                  memberId: member.id,
                                  direction: "up",
                                })
                              }
                              disabled={index === 0}
                              data-testid={`button-move-up-${member.id}`}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-4 w-4 p-0"
                              onClick={() =>
                                reorderMemberMutation.mutate({
                                  pairingId: pairing.id,
                                  memberId: member.id,
                                  direction: "down",
                                })
                              }
                              disabled={index === pairing.members.length - 1}
                              data-testid={`button-move-down-${member.id}`}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="flex-1 text-sm">{member.user.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() =>
                              removeMemberMutation.mutate({
                                pairingId: pairing.id,
                                memberId: member.id,
                              })
                            }
                            data-testid={`button-remove-${member.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                  </div>

                  {pairing.members.length < 4 && event.availablePlayers.length > 0 && (
                    <Select
                      onValueChange={(userId) =>
                        addMemberMutation.mutate({ pairingId: pairing.id, userId })
                      }
                    >
                      <SelectTrigger className="w-full" data-testid={`select-add-player-${pairing.id}`}>
                        <SelectValue placeholder="Add player..." />
                      </SelectTrigger>
                      <SelectContent>
                        {event.availablePlayers.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {event.pairings.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No pairings yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Create groups and assign players to organize your event
                </p>
              </CardContent>
            </Card>
          )}
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
    </div>
  );
}
