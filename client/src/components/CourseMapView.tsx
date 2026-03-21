import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, MapPin, Phone, ExternalLink, Plus } from "lucide-react";
import type { Course, Poll } from "@shared/schema";

interface CourseMapViewProps {
  coursePoll?: Poll;
  isOrganizer?: boolean;
  eventId?: string;
}

export function CourseMapView({ coursePoll, isOrganizer }: CourseMapViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [addedCourseIds, setAddedCourseIds] = useState<Set<string>>(new Set());

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses/map"],
  });

  const addToPollMutation = useMutation({
    mutationFn: ({ pollId, courseId }: { pollId: string; courseId: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/options`, { courseId }),
    onSuccess: (_data, vars) => {
      setAddedCourseIds(prev => new Set(Array.from(prev).concat(vars.courseId)));
      if (coursePoll?.eventId) {
        queryClient.invalidateQueries({ queryKey: ["/api/polls/event", coursePoll.eventId] });
        queryClient.invalidateQueries({ queryKey: ["/api/events", coursePoll.eventId] });
      }
      toast({ title: "Course added to poll" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add course", description: error.message, variant: "destructive" });
    },
  });

  const canAddToPoll = isOrganizer && coursePoll && coursePoll.visibility !== "hidden";

  const filtered = courses.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const sendFilterToMap = useCallback((query: string) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "filter", query }, window.location.origin);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    sendFilterToMap(e.target.value);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type: string; courseId?: string };
      if (data.type === "selectCourse" && data.courseId) {
        const course = courses.find(c => c.id === data.courseId);
        if (course) setSelectedCourse(course);
      }
      if (data.type === "addToPoll" && data.courseId && canAddToPoll && coursePoll) {
        addToPollMutation.mutate({ pollId: coursePoll.id, courseId: data.courseId });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [courses, canAddToPoll, coursePoll]);

  const iframeSrc = (() => {
    const params = new URLSearchParams();
    if (coursePoll) params.set("pollId", coursePoll.id);
    if (canAddToPoll) params.set("canAddToPoll", "1");
    return `/api/maps/frame?${params.toString()}`;
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter courses by name, city, or tags..."
          value={search}
          onChange={handleSearchChange}
          className="pl-10"
          data-testid="input-map-search"
        />
      </div>

      <div className="flex gap-3" style={{ height: 420 }}>
        {/* Side list */}
        <div className="w-56 shrink-0 flex flex-col border rounded-md overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground shrink-0">
            {filtered.length} of {courses.length} courses
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1 space-y-0.5">
              {filtered.map(course => (
                <button
                  key={course.id}
                  className={`w-full text-left px-2 py-2 rounded-sm text-sm hover-elevate transition-colors ${
                    selectedCourse?.id === course.id ? "bg-accent" : ""
                  }`}
                  onClick={() => {
                    setSelectedCourse(course);
                    iframeRef.current?.contentWindow?.postMessage(
                      { type: "focusCourse", courseId: course.id },
                      window.location.origin
                    );
                  }}
                  data-testid={`list-course-${course.id}`}
                >
                  <div className="font-medium leading-tight truncate">{course.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{course.city}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Map iframe */}
        <div className="flex-1 border rounded-md overflow-hidden">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="GTA Golf Course Map"
            data-testid="course-map"
            style={{ width: "100%", height: "100%", border: "none" }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      {/* Selected course detail */}
      {selectedCourse && (
        <div className="border rounded-md p-3 bg-muted/30" data-testid="selected-course-detail">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-sm">{selectedCourse.name}</h3>
              <p className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  {selectedCourse.address && (
                    <span className="block">{selectedCourse.address}</span>
                  )}
                  <span>{selectedCourse.city}, {selectedCourse.region}</span>
                </span>
              </p>
            </div>
            {canAddToPoll && coursePoll && (
              <Button
                size="sm"
                disabled={addedCourseIds.has(selectedCourse.id) || addToPollMutation.isPending}
                onClick={() => addToPollMutation.mutate({ pollId: coursePoll.id, courseId: selectedCourse.id })}
                data-testid={`button-add-to-poll-detail-${selectedCourse.id}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                {addedCourseIds.has(selectedCourse.id) ? "Added" : "Add to Poll"}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedCourse.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {selectedCourse.feeNote && <span>{selectedCourse.feeNote}</span>}
            {selectedCourse.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {selectedCourse.phone}
              </span>
            )}
            {selectedCourse.website && (
              <a
                href={selectedCourse.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />Website
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
