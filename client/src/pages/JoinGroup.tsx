import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Users } from "lucide-react";
import { Link } from "wouter";
import type { Group } from "@shared/schema";

export default function JoinGroup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");

  const joinMutation = useMutation({
    mutationFn: (code: string) => {
      return apiRequest<Group>("POST", `/api/groups/join/${code}`, {});
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/mine"] });
      toast({ title: `Joined ${group.name}!` });
      setLocation(`/groups/${group.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join group",
        description: error.message || "Invalid join code",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    joinMutation.mutate(joinCode.trim().toUpperCase());
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
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold">Join a Group</CardTitle>
                <CardDescription>Enter the join code you received</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Join Code</Label>
                <Input
                  id="joinCode"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="font-mono text-lg tracking-wider"
                  required
                  data-testid="input-join-code"
                />
                <p className="text-sm text-muted-foreground">
                  The 6-character code provided by the group owner
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={joinMutation.isPending || !joinCode.trim()}
                  data-testid="button-join"
                >
                  {joinMutation.isPending ? "Joining..." : "Join Group"}
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
