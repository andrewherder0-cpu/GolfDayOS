import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, Upload, MapPin, ExternalLink } from "lucide-react";
import type { Course, InsertCourse } from "@shared/schema";

export default function Courses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [newCourseOpen, setNewCourseOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  
  const [courseForm, setCourseForm] = useState<InsertCourse>({
    name: "",
    city: "",
    region: "",
    lat: undefined,
    lng: undefined,
    tags: [],
    feeNote: "",
    website: "",
    isActive: true,
  });

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses", searchQuery],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCourse) => apiRequest<Course>("POST", "/api/courses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Course added successfully!" });
      setNewCourseOpen(false);
      setCourseForm({
        name: "",
        city: "",
        region: "",
        tags: [],
        feeNote: "",
        website: "",
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add course", description: error.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/courses/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: `Imported ${data.count} courses successfully!` });
      setImportOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(courseForm);
  };

  const filteredCourses = courses?.filter((course) => {
    const query = searchQuery.toLowerCase();
    return (
      course.name.toLowerCase().includes(query) ||
      course.city.toLowerCase().includes(query) ||
      course.region.toLowerCase().includes(query) ||
      course.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Course Directory</h1>
          <p className="text-muted-foreground">Browse and manage golf courses</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses by name, city, region, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <div className="flex gap-2">
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-import">
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Courses from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with columns: name, city, region, lat, lng, tags, feeNote, website
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importMutation.isPending}
                    data-testid="button-upload-file"
                  >
                    {importMutation.isPending ? "Importing..." : "Choose File"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={newCourseOpen} onOpenChange={setNewCourseOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-course">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Course</DialogTitle>
                  <DialogDescription>Enter the course details below</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="name">Course Name*</Label>
                      <Input
                        id="name"
                        value={courseForm.name}
                        onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                        required
                        data-testid="input-course-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City*</Label>
                      <Input
                        id="city"
                        value={courseForm.city}
                        onChange={(e) => setCourseForm({ ...courseForm, city: e.target.value })}
                        required
                        data-testid="input-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Region*</Label>
                      <Input
                        id="region"
                        value={courseForm.region}
                        onChange={(e) => setCourseForm({ ...courseForm, region: e.target.value })}
                        required
                        placeholder="e.g., ON, CA"
                        data-testid="input-region"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={courseForm.website}
                        onChange={(e) => setCourseForm({ ...courseForm, website: e.target.value })}
                        placeholder="https://..."
                        data-testid="input-website"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="feeNote">Fee Note</Label>
                      <Input
                        id="feeNote"
                        value={courseForm.feeNote}
                        onChange={(e) => setCourseForm({ ...courseForm, feeNote: e.target.value })}
                        placeholder="e.g., $75-$120 depending on time"
                        data-testid="input-fee-note"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setNewCourseOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-course">
                      {createMutation.isPending ? "Adding..." : "Add Course"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </>
          ) : filteredCourses && filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <Card key={course.id} className="hover-elevate" data-testid={`card-course-${course.id}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {course.city}, {course.region}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {course.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {course.feeNote && (
                    <p className="text-sm text-muted-foreground">{course.feeNote}</p>
                  )}
                  {course.website && (
                    <a
                      href={course.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      data-testid={`link-website-${course.id}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Website
                    </a>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6 text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No courses found matching your search" : "No courses yet"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
