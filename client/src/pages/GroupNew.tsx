import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { Group } from "@shared/schema";

export default function GroupNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { name: string }) => {
      return apiRequest<Group>("POST", "/api/groups", data);
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/mine"] });
      toast({ title: "Group created successfully!" });
      setLocation(`/groups/${group.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name });
  };

  return (
    <main className="max-w-2xl mx-auto p-8">
        <Link href="/dashboard">
          <a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6" data-testid="link-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </a>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Create New Group</CardTitle>
            <CardDescription>
              Start a new golf group to organize events with your friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekend Warriors Golf Club"
                  required
                  data-testid="input-group-name"
                />
                <p className="text-sm text-muted-foreground">
                  Choose a memorable name for your group
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !name.trim()}
                  data-testid="button-create-group"
                >
                  {createMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
                <Link href="/dashboard">
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
