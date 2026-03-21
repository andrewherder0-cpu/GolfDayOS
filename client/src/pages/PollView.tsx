import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { Vote, CheckCircle2, Calendar, MapPin, Plus } from "lucide-react";
import type { Event, Group, Poll, PollOption, Vote as VoteType, Course } from "@shared/schema";

interface PollWithDetails extends Poll {
  options: (PollOption & { course?: Course; voteCount: number })[];
  userVote?: VoteType;
}

interface EventWithPolls extends Event {
  group: Group;
  polls: PollWithDetails[];
}

export default function PollView() {
  const [, params] = useRoute("/events/:id/polls");
  const eventId = params?.id;
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [tiebreakSelection, setTiebreakSelection] = useState<string>("");
  const [newDateInputs, setNewDateInputs] = useState<Record<string, string>>({});

  const { data: event, isLoading } = useQuery<EventWithPolls>({
    queryKey: ["/api/polls/event", eventId],
    enabled: !!eventId,
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/vote`, { optionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      toast({ title: "Vote recorded!" });
    },
  });

  const addDateOptionMutation = useMutation({
    mutationFn: ({ pollId, dateOption }: { pollId: string; dateOption: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/options`, { dateOption }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      setNewDateInputs(prev => ({ ...prev, [variables.pollId]: "" }));
      toast({ title: "Date added to poll!" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Could not add date";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const closePollMutation = useMutation({
    mutationFn: (pollId: string) => apiRequest("POST", `/api/polls/${pollId}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      toast({ title: "Poll closed" });
    },
  });

  const applyResultMutation = useMutation({
    mutationFn: ({ pollId, winningOptionId }: { pollId: string; winningOptionId?: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/apply-result`, { winningOptionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Poll result applied!" });
    },
  });

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto p-8">
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  const isOwner = event.createdBy === user?.id;

  const handleVote = (pollId: string) => {
    const optionId = selectedOptions[pollId];
    if (optionId) {
      voteMutation.mutate({ pollId, optionId });
    }
  };

  const handleAddDate = (pollId: string) => {
    const dateStr = newDateInputs[pollId];
    if (!dateStr) return;
    addDateOptionMutation.mutate({ pollId, dateOption: dateStr });
  };

  const getTopOptions = (poll: PollWithDetails) => {
    const maxVotes = Math.max(...poll.options.map((o) => o.voteCount));
    return poll.options.filter((o) => o.voteCount === maxVotes);
  };

  // Get today in YYYY-MM-DD for min date input
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-4xl mx-auto p-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: event.group.name, href: `/groups/${event.groupId}` },
            { label: event.title, href: `/events/${eventId}` },
            { label: "Polls" },
          ]}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Event Polls</h1>
          <p className="text-muted-foreground">Vote on course and date options</p>
        </div>

        <div className="mt-8 space-y-6">
          {event.polls.map((poll) => {
            const hasVoted = !!poll.userVote;
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
            const topOptions = getTopOptions(poll);
            const isTied = topOptions.length > 1 && totalVotes > 0;
            const isDatePoll = poll.type === "date";

            return (
              <Card key={poll.id} data-testid={`card-poll-${poll.type}`}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {isDatePoll ? <Calendar className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                        {isDatePoll ? "Choose a Date" : "Choose a Course"}
                      </CardTitle>
                      <CardDescription>
                        {hasVoted ? "You've voted" : poll.options.length === 0 ? "No options yet — add dates below" : "Select your preferred option"}
                      </CardDescription>
                    </div>
                    {hasVoted && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Add date option — shown to all members for date polls */}
                  {isDatePoll && poll.visibility === "live" && (
                    <div className="flex gap-2 items-center p-3 bg-muted/40 rounded-md">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        type="date"
                        min={todayStr}
                        value={newDateInputs[poll.id] || ""}
                        onChange={(e) => setNewDateInputs(prev => ({ ...prev, [poll.id]: e.target.value }))}
                        className="flex-1"
                        data-testid={`input-date-option-${poll.id}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddDate(poll.id)}
                        disabled={!newDateInputs[poll.id] || addDateOptionMutation.isPending}
                        data-testid={`button-add-date-${poll.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />Suggest Date
                      </Button>
                    </div>
                  )}

                  {poll.options.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isDatePoll ? "Use the date picker above to suggest dates for the group to vote on." : "No course options have been added yet."}
                    </p>
                  ) : !hasVoted ? (
                    <>
                      <RadioGroup
                        value={selectedOptions[poll.id] || ""}
                        onValueChange={(value) =>
                          setSelectedOptions({ ...selectedOptions, [poll.id]: value })
                        }
                      >
                        {poll.options.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center space-x-3 border rounded-lg p-4 hover-elevate"
                            data-testid={`option-${option.id}`}
                          >
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                              <div>
                                <p className="font-medium">{option.label}</p>
                                {option.course && (
                                  <p className="text-sm text-muted-foreground">
                                    {option.course.city}, {option.course.region}
                                  </p>
                                )}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <Button
                        onClick={() => handleVote(poll.id)}
                        disabled={!selectedOptions[poll.id] || voteMutation.isPending}
                        data-testid={`button-vote-${poll.type}`}
                      >
                        <Vote className="h-4 w-4 mr-2" />
                        {voteMutation.isPending ? "Voting..." : "Submit Vote"}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      {poll.options.map((option) => {
                        const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
                        const isUserChoice = poll.userVote?.optionId === option.id;
                        return (
                          <div
                            key={option.id}
                            className={`border rounded-lg p-4 ${isUserChoice ? "border-primary" : ""}`}
                            data-testid={`result-${option.id}`}
                          >
                            <div className="flex justify-between mb-2">
                              <div>
                                <p className="font-medium">{option.label}</p>
                                {option.course && (
                                  <p className="text-sm text-muted-foreground">
                                    {option.course.city}, {option.course.region}
                                  </p>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {option.voteCount} vote{option.voteCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isOwner && poll.visibility === "live" && (
                    <div className="pt-4 border-t space-y-3">
                      <h4 className="text-sm font-medium">Organizer Actions</h4>
                      {isTied && totalVotes > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            There's a tie! Choose the winning option:
                          </p>
                          <Select value={tiebreakSelection} onValueChange={setTiebreakSelection}>
                            <SelectTrigger data-testid={`select-tiebreak-${poll.type}`}>
                              <SelectValue placeholder="Select winner..." />
                            </SelectTrigger>
                            <SelectContent>
                              {topOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() =>
                              applyResultMutation.mutate({ pollId: poll.id, winningOptionId: tiebreakSelection })
                            }
                            disabled={!tiebreakSelection || applyResultMutation.isPending}
                            data-testid={`button-apply-tiebreak-${poll.type}`}
                          >
                            Apply Winner
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => closePollMutation.mutate(poll.id)}
                            disabled={closePollMutation.isPending}
                            data-testid={`button-close-poll-${poll.type}`}
                          >
                            Close Poll
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applyResultMutation.mutate({ pollId: poll.id })}
                            disabled={applyResultMutation.isPending || totalVotes === 0}
                            data-testid={`button-apply-result-${poll.type}`}
                          >
                            Apply Top Result
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
