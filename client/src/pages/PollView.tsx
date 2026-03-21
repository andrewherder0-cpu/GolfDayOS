import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { Vote, CheckCircle2, Calendar, MapPin, Plus, Trash2, ChevronsUpDown } from "lucide-react";
import type { Event, Group, Poll, PollOption, Vote as VoteType, Course, Membership } from "@shared/schema";

interface PollWithDetails extends Poll {
  options: (PollOption & { course?: Course; voteCount: number })[];
  userVotes: VoteType[];
}

interface EventWithPolls extends Event {
  group: Group;
  polls: PollWithDetails[];
  membership?: Membership;
}

export default function PollView() {
  const [, params] = useRoute("/events/:id/polls");
  const eventId = params?.id;
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Single-select: Record<pollId, optionId>
  const [selectedOption, setSelectedOption] = useState<Record<string, string>>({});
  // Multi-select: Record<pollId, Set of optionIds>
  const [selectedMulti, setSelectedMulti] = useState<Record<string, string[]>>({});

  const [tiebreakSelection, setTiebreakSelection] = useState<string>("");
  const [newDateInputs, setNewDateInputs] = useState<Record<string, string>>({});
  const [coursePickerOpen, setCoursePickerOpen] = useState<Record<string, boolean>>({});
  const [selectedCourseIds, setSelectedCourseIds] = useState<Record<string, string>>({});
  const [selectedCourseLabels, setSelectedCourseLabels] = useState<Record<string, string>>({});

  const { data: event, isLoading } = useQuery<EventWithPolls>({
    queryKey: ["/api/polls/event", eventId],
    enabled: !!eventId,
  });

  const { data: allCourses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    enabled: !!eventId,
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionIds }: { pollId: string; optionIds: string[] }) =>
      apiRequest("POST", `/api/polls/${pollId}/vote`, { optionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      toast({ title: "Vote recorded!" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Could not submit vote";
      toast({ title: "Error", description: msg, variant: "destructive" });
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

  const addCourseOptionMutation = useMutation({
    mutationFn: ({ pollId, courseId }: { pollId: string; courseId: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/options`, { courseId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      setSelectedCourseIds(prev => ({ ...prev, [variables.pollId]: "" }));
      setSelectedCourseLabels(prev => ({ ...prev, [variables.pollId]: "" }));
      toast({ title: "Course added to poll!" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Could not add course";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deletePollMutation = useMutation({
    mutationFn: (pollId: string) => apiRequest("DELETE", `/api/polls/${pollId}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Poll deleted" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Could not delete poll";
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

  const isOrganizer = event.createdBy === user?.id ||
    event.membership?.role === "owner" ||
    event.membership?.role === "organizer";

  const toggleMultiOption = (pollId: string, optionId: string) => {
    setSelectedMulti(prev => {
      const current = prev[pollId] ?? [];
      const exists = current.includes(optionId);
      return {
        ...prev,
        [pollId]: exists ? current.filter(id => id !== optionId) : [...current, optionId],
      };
    });
  };

  const handleVote = (poll: PollWithDetails) => {
    if (poll.multiSelect) {
      const ids = selectedMulti[poll.id] ?? [];
      if (!ids.length) return;
      voteMutation.mutate({ pollId: poll.id, optionIds: ids });
    } else {
      const id = selectedOption[poll.id];
      if (!id) return;
      voteMutation.mutate({ pollId: poll.id, optionIds: [id] });
    }
  };

  const getTopOptions = (poll: PollWithDetails) => {
    const maxVotes = Math.max(...poll.options.map((o) => o.voteCount));
    return poll.options.filter((o) => o.voteCount === maxVotes);
  };

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
            const hasVoted = poll.userVotes.length > 0;
            const votedOptionIds = new Set(poll.userVotes.map(v => v.optionId));
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
            const topOptions = getTopOptions(poll);
            const isTied = topOptions.length > 1 && totalVotes > 0;
            const isDatePoll = poll.type === "date";

            const alreadyAddedCourseIds = new Set(poll.options.map(o => o.courseId).filter(Boolean));
            const availableCourses = allCourses.filter(c => !alreadyAddedCourseIds.has(c.id));

            // For multiSelect: pre-seed the selected state from userVotes if not already set
            const currentMultiSelection = selectedMulti[poll.id] ??
              (hasVoted && poll.multiSelect ? Array.from(votedOptionIds) : []);

            return (
              <Card key={poll.id} data-testid={`card-poll-${poll.type}`}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {isDatePoll ? <Calendar className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                        {isDatePoll ? "Choose a Date" : "Choose a Course"}
                        {poll.multiSelect && (
                          <Badge variant="secondary" className="text-xs">Multi-select</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {poll.multiSelect
                          ? hasVoted
                            ? `You selected ${poll.userVotes.length} option${poll.userVotes.length !== 1 ? "s" : ""} — you can update your selection`
                            : "Select all options that work for you"
                          : hasVoted
                            ? "You've voted"
                            : poll.options.length === 0
                              ? (isDatePoll ? "No options yet — suggest a date below" : "No courses added yet")
                              : "Select your preferred option"
                        }
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasVoted && !poll.multiSelect && <CheckCircle2 className="h-6 w-6 text-green-600" />}
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
                          data-testid={`button-delete-poll-${poll.type}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Delete Poll
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Add date option — all group members can suggest dates */}
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
                        onClick={() => {
                          if (newDateInputs[poll.id]) {
                            addDateOptionMutation.mutate({ pollId: poll.id, dateOption: newDateInputs[poll.id] });
                          }
                        }}
                        disabled={!newDateInputs[poll.id] || addDateOptionMutation.isPending}
                        data-testid={`button-add-date-${poll.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />Suggest Date
                      </Button>
                    </div>
                  )}

                  {/* Add course option — organizer only, searchable combobox */}
                  {!isDatePoll && poll.visibility === "live" && isOrganizer && (
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
                            data-testid={`button-course-picker-${poll.id}`}
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
                                  data-testid={`course-option-${course.id}`}
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
                          if (courseId) addCourseOptionMutation.mutate({ pollId: poll.id, courseId });
                        }}
                        disabled={!selectedCourseIds[poll.id] || addCourseOptionMutation.isPending}
                        data-testid={`button-add-course-${poll.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />Add
                      </Button>
                    </div>
                  )}

                  {poll.options.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isDatePoll
                        ? "Use the date picker above to suggest dates for the group to vote on."
                        : isOrganizer
                          ? "Use the search above to add courses to this poll."
                          : "No course options have been added yet."}
                    </p>
                  ) : poll.multiSelect ? (
                    /* ── Multi-select: always show checkboxes + results ── */
                    <div className="space-y-3">
                      {poll.options.map((option) => {
                        const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
                        const isChecked = currentMultiSelection.includes(option.id);
                        const wasVoted = votedOptionIds.has(option.id);
                        return (
                          <div
                            key={option.id}
                            className={`border rounded-lg p-4 ${wasVoted ? "border-primary" : ""}`}
                            data-testid={`option-${option.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`multi-${option.id}`}
                                checked={isChecked}
                                onCheckedChange={() => toggleMultiOption(poll.id, option.id)}
                                disabled={poll.visibility !== "live"}
                                className="mt-0.5"
                                data-testid={`checkbox-option-${option.id}`}
                              />
                              <Label htmlFor={`multi-${option.id}`} className="flex-1 cursor-pointer">
                                <p className="font-medium">{option.label}</p>
                                {option.course && (
                                  <p className="text-sm text-muted-foreground">
                                    {option.course.city}, {option.course.region}
                                  </p>
                                )}
                              </Label>
                              <span className="text-sm text-muted-foreground shrink-0">
                                {option.voteCount} vote{option.voteCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {hasVoted && (
                              <div className="mt-2">
                                <Progress value={percentage} className="h-1.5" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {poll.visibility === "live" && (
                        <Button
                          onClick={() => handleVote(poll)}
                          disabled={currentMultiSelection.length === 0 || voteMutation.isPending}
                          data-testid={`button-vote-${poll.type}`}
                        >
                          <Vote className="h-4 w-4 mr-2" />
                          {voteMutation.isPending
                            ? "Saving..."
                            : hasVoted
                              ? `Update Selection (${currentMultiSelection.length} selected)`
                              : `Submit Selection (${currentMultiSelection.length} selected)`}
                        </Button>
                      )}
                    </div>
                  ) : !hasVoted ? (
                    /* ── Single-select: radio group before voting ── */
                    <>
                      <RadioGroup
                        value={selectedOption[poll.id] || ""}
                        onValueChange={(value) =>
                          setSelectedOption(prev => ({ ...prev, [poll.id]: value }))
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
                              <p className="font-medium">{option.label}</p>
                              {option.course && (
                                <p className="text-sm text-muted-foreground">
                                  {option.course.city}, {option.course.region}
                                </p>
                              )}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <Button
                        onClick={() => handleVote(poll)}
                        disabled={!selectedOption[poll.id] || voteMutation.isPending}
                        data-testid={`button-vote-${poll.type}`}
                      >
                        <Vote className="h-4 w-4 mr-2" />
                        {voteMutation.isPending ? "Voting..." : "Submit Vote"}
                      </Button>
                    </>
                  ) : (
                    /* ── Single-select: results after voting ── */
                    <div className="space-y-3">
                      {poll.options.map((option) => {
                        const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
                        const isUserChoice = votedOptionIds.has(option.id);
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

                  {isOrganizer && poll.visibility === "live" && (
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
