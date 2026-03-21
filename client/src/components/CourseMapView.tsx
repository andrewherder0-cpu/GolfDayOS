import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, MapPin, Phone, ExternalLink, Plus, X } from "lucide-react";
import type { Course, Poll } from "@shared/schema";

import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const GTA_CENTER: [number, number] = [43.7615, -79.4111];
const GTA_ZOOM = 10;

function MapBoundsController({ courses }: { courses: Course[] }) {
  const map = useMap();

  useEffect(() => {
    if (courses.length > 0) {
      const valid = courses.filter(c => c.lat != null && c.lng != null);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(c => [c.lat!, c.lng!] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, []);

  return null;
}

interface CourseMapViewProps {
  coursePoll?: Poll;
  isOrganizer?: boolean;
  eventId?: string;
}

export function CourseMapView({ coursePoll, isOrganizer, eventId: _eventId }: CourseMapViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [addedCourseIds, setAddedCourseIds] = useState<Set<string>>(new Set());

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses/map"],
  });

  const addToPollMutation = useMutation({
    mutationFn: ({ pollId, courseId }: { pollId: string; courseId: string }) =>
      apiRequest("POST", `/api/polls/${pollId}/options`, { courseId }),
    onSuccess: (_data, vars) => {
      setAddedCourseIds(prev => new Set([...prev, vars.courseId]));
      if (coursePoll?.eventId) {
        queryClient.invalidateQueries({ queryKey: ["/api/polls/event", coursePoll.eventId] });
        queryClient.invalidateQueries({ queryKey: ["/api/events", coursePoll.eventId] });
      }
      toast({ title: "Course added to poll" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add course", description: error.message, variant: "destructive" });
    },
  });

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

  const canAddToPoll = isOrganizer && coursePoll && coursePoll.visibility !== "hidden";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter courses by name or city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-map-search"
        />
      </div>

      {isLoading ? (
        <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">
          Loading map...
        </div>
      ) : (
        <div className="rounded-md overflow-hidden border" style={{ height: 380 }}>
          <MapContainer
            center={GTA_CENTER}
            zoom={GTA_ZOOM}
            style={{ height: "100%", width: "100%" }}
            data-testid="course-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBoundsController courses={filtered} />
            {filtered.map(course => (
              <Marker
                key={course.id}
                position={[course.lat!, course.lng!]}
                eventHandlers={{ click: () => setSelectedCourse(course) }}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <p className="font-semibold text-sm mb-1">{course.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3 inline" /> {course.city}, {course.region}
                    </p>
                    {course.feeNote && (
                      <p className="text-xs text-muted-foreground mb-1">{course.feeNote}</p>
                    )}
                    {course.phone && (
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3 inline" /> {course.phone}
                      </p>
                    )}
                    <div className="flex gap-1 flex-wrap mb-2">
                      {course.tags.map(tag => (
                        <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded-sm">{tag}</span>
                      ))}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {course.website && (
                        <a
                          href={course.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Website
                        </a>
                      )}
                    </div>
                    {canAddToPoll && (
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        disabled={addedCourseIds.has(course.id) || addToPollMutation.isPending}
                        onClick={() => addToPollMutation.mutate({ pollId: coursePoll!.id, courseId: course.id })}
                        data-testid={`button-add-to-poll-${course.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {addedCourseIds.has(course.id) ? "Added" : "Add to Poll"}
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {selectedCourse && (
        <div className="border rounded-md p-3 bg-muted/30 relative" data-testid="selected-course-detail">
          <button
            onClick={() => setSelectedCourse(null)}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <h3 className="font-semibold text-sm mb-1">{selectedCourse.name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3" /> {selectedCourse.city}, {selectedCourse.region}
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedCourse.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {selectedCourse.feeNote && <span>{selectedCourse.feeNote}</span>}
            {selectedCourse.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />{selectedCourse.phone}
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
          {canAddToPoll && (
            <Button
              size="sm"
              className="mt-3"
              disabled={addedCourseIds.has(selectedCourse.id) || addToPollMutation.isPending}
              onClick={() => addToPollMutation.mutate({ pollId: coursePoll!.id, courseId: selectedCourse.id })}
              data-testid={`button-add-to-poll-detail-${selectedCourse.id}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              {addedCourseIds.has(selectedCourse.id) ? "Added to Poll" : "Add to Course Poll"}
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {courses.length} courses &middot; Map data &copy; OpenStreetMap contributors
      </p>
    </div>
  );
}
