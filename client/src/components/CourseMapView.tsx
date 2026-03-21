import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, MapPin, Phone, ExternalLink, Plus, X } from "lucide-react";
import type { Course, Poll } from "@shared/schema";

interface MapConfig {
  key: string;
}

interface CourseMapViewProps {
  coursePoll?: Poll;
  isOrganizer?: boolean;
  eventId?: string;
}

const GTA_CENTER = { lat: 43.7615, lng: -79.4111 };
const GTA_ZOOM = 10;

declare global {
  interface Window {
    google: typeof google;
    initGolfMap?: () => void;
  }
}

let mapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (mapsScriptPromise) return mapsScriptPromise;
  if (window.google?.maps) {
    mapsScriptPromise = Promise.resolve();
    return mapsScriptPromise;
  }
  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    window.initGolfMap = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGolfMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}

export function CourseMapView({ coursePoll, isOrganizer }: CourseMapViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [addedCourseIds, setAddedCourseIds] = useState<Set<string>>(new Set());

  const { data: mapConfig } = useQuery<MapConfig>({
    queryKey: ["/api/maps/config"],
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
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
    onError: (error: Error) => {
      toast({ title: "Failed to add course", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!mapConfig?.key) return;
    loadGoogleMapsScript(mapConfig.key)
      .then(() => setMapsReady(true))
      .catch(err => setMapsError(err.message));
  }, [mapConfig?.key]);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || mapInstanceRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: GTA_CENTER,
      zoom: GTA_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;
    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, []);

  useEffect(() => {
    if (mapsReady) initMap();
  }, [mapsReady, initMap]);

  const canAddToPoll = isOrganizer && coursePoll && coursePoll.visibility !== "hidden";

  const buildInfoContent = useCallback((course: Course) => {
    const tagsHtml = course.tags
      .map(t => `<span style="font-size:11px;background:#f1f5f9;padding:1px 6px;border-radius:3px;margin-right:3px;">${t}</span>`)
      .join("");
    const addBtnId = `add-btn-${course.id}`;
    const alreadyAdded = addedCourseIds.has(course.id);
    const addBtn = canAddToPoll
      ? `<button id="${addBtnId}" data-testid="button-add-to-poll-${course.id}" style="margin-top:8px;padding:5px 10px;background:#16a34a;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;width:100%;">${alreadyAdded ? "Added" : "Add to Poll"}</button>`
      : "";
    return `
      <div style="min-width:200px;max-width:240px;font-family:inherit;">
        <p style="font-weight:600;font-size:13px;margin:0 0 4px;">${course.name}</p>
        <p style="font-size:11px;color:#64748b;margin:0 0 6px;">${course.city}, ${course.region}</p>
        ${course.feeNote ? `<p style="font-size:11px;color:#64748b;margin:0 0 4px;">${course.feeNote}</p>` : ""}
        ${course.phone ? `<p style="font-size:11px;color:#64748b;margin:0 0 4px;">&#9742; ${course.phone}</p>` : ""}
        <div style="margin-bottom:6px;">${tagsHtml}</div>
        ${course.website ? `<a href="${course.website}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#2563eb;">Website &rarr;</a>` : ""}
        ${addBtn}
      </div>
    `;
  }, [canAddToPoll, addedCourseIds]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;
    if (!map || !infoWindow || !window.google?.maps) return;

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

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    filtered.forEach(course => {
      if (course.lat == null || course.lng == null) return;
      const marker = new window.google.maps.Marker({
        position: { lat: course.lat, lng: course.lng },
        map,
        title: course.name,
      });

      marker.addListener("click", () => {
        setSelectedCourse(course);
        infoWindow.setContent(buildInfoContent(course));
        infoWindow.open(map, marker);

        setTimeout(() => {
          const btn = document.getElementById(`add-btn-${course.id}`);
          if (btn && canAddToPoll && coursePoll && !addedCourseIds.has(course.id)) {
            btn.onclick = () => {
              addToPollMutation.mutate({ pollId: coursePoll.id, courseId: course.id });
              infoWindow.close();
            };
          }
        }, 100);
      });

      markersRef.current.set(course.id, marker);
    });
  }, [courses, search, mapsReady, buildInfoContent, canAddToPoll, coursePoll, addedCourseIds]);

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

  if (mapsError) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Unable to load map: {mapsError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter courses by name, city, or tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-map-search"
        />
      </div>

      {(coursesLoading || !mapsReady) ? (
        <div className="h-80 flex items-center justify-center text-muted-foreground text-sm border rounded-md bg-muted/20">
          Loading map...
        </div>
      ) : (
        <div
          ref={mapRef}
          data-testid="course-map"
          className="rounded-md border"
          style={{ height: 380, width: "100%" }}
        />
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
          {canAddToPoll && coursePoll && (
            <Button
              size="sm"
              className="mt-3"
              disabled={addedCourseIds.has(selectedCourse.id) || addToPollMutation.isPending}
              onClick={() => {
                addToPollMutation.mutate({ pollId: coursePoll.id, courseId: selectedCourse.id });
              }}
              data-testid={`button-add-to-poll-detail-${selectedCourse.id}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              {addedCourseIds.has(selectedCourse.id) ? "Added to Poll" : "Add to Course Poll"}
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {courses.length} courses
      </p>
    </div>
  );
}
