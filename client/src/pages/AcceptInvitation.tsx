import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/AuthProvider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, XCircle, Clock } from "lucide-react";

interface InvitationInfo {
  token: string;
  email: string;
  groupId: string;
  groupName: string;
  inviterName: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export default function AcceptInvitation() {
  const [, params] = useRoute("/invitations/:token");
  const token = params?.token ?? "";
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const autoAcceptFiredRef = useRef(false); // prevents re-triggering auto-accept after an error

  const { data: invitation, isLoading, error } = useQuery<InvitationInfo>({
    queryKey: ["/api/invitations", token],
    queryFn: () => fetch(`/api/invitations/${token}`).then(async r => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || "Invitation not found");
      }
      return r.json();
    }),
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/invitations/${token}/accept`, {});
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to accept invitation");
      return body as { groupId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/mine"] });
      toast({ title: "You've joined the group!", description: `Welcome to ${invitation?.groupName}` });
      setLocation(`/groups/${data.groupId}`);
    },
    onError: (err: Error) => {
      // Don't reset autoAcceptFiredRef — manual retry is via the button
      toast({ title: "Could not accept invitation", description: err.message, variant: "destructive" });
    },
  });

  const isExpired = invitation ? new Date(invitation.expiresAt) < new Date() : false;
  const isAlreadyAccepted = invitation?.acceptedAt != null;
  const isValid = invitation && !isExpired && !isAlreadyAccepted;

  // Auto-accept once when user is authenticated, emails match, and invitation is valid
  const emailMatches = user && invitation && user.email.toLowerCase() === invitation.email.toLowerCase();
  useEffect(() => {
    if (user && isValid && emailMatches && !autoAcceptFiredRef.current && !acceptMutation.isPending && !acceptMutation.isSuccess) {
      autoAcceptFiredRef.current = true;
      acceptMutation.mutate();
    }
  }, [user, isValid, emailMatches]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="h-8 w-8 text-destructive" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>
              {error instanceof Error ? error.message : "This invitation link is invalid or has been removed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-go-home">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAlreadyAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <CardTitle>Already Accepted</CardTitle>
            </div>
            <CardDescription>
              This invitation to <strong>{invitation.groupName}</strong> has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user ? (
              <Link href={`/groups/${invitation.groupId}`}>
                <Button className="w-full" data-testid="button-go-to-group">Go to Group</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button className="w-full" data-testid="button-sign-in">Sign In</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <CardTitle>Invitation Expired</CardTitle>
            </div>
            <CardDescription>
              This invitation to <strong>{invitation.groupName}</strong> expired on{" "}
              {new Date(invitation.expiresAt).toLocaleDateString()}. Ask{" "}
              {invitation.inviterName} to send a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-go-home">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle data-testid="text-invitation-group-name">Join {invitation.groupName}</CardTitle>
              <CardDescription>Golf Day OS</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
            <p>
              <span className="font-medium" data-testid="text-inviter-name">{invitation.inviterName}</span>{" "}
              has invited you to join{" "}
              <span className="font-medium">{invitation.groupName}</span>.
            </p>
            <p className="text-muted-foreground text-xs">
              Invitation for {invitation.email} &mdash; expires{" "}
              {new Date(invitation.expiresAt).toLocaleDateString()}
            </p>
          </div>

          {user ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Signed in as <strong>{user.name}</strong>{" "}
                <span className="text-xs">({user.email})</span>
              </p>
              {user.email.toLowerCase() !== invitation.email.toLowerCase() && (
                <p className="text-sm text-destructive" data-testid="text-email-mismatch">
                  This invitation was sent to <strong>{invitation.email}</strong>. Please sign in with that email to accept.
                </p>
              )}
              <Button
                className="w-full"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending || acceptMutation.isSuccess}
                data-testid="button-accept-invitation"
              >
                {acceptMutation.isPending ? "Joining..." : `Join ${invitation.groupName}`}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Create an account or sign in to accept this invitation. You'll be added automatically.
              </p>
              <Link href={`/signup?email=${encodeURIComponent(invitation.email)}&next=${encodeURIComponent(`/invitations/${token}`)}`}>
                <Button className="w-full" data-testid="button-create-account">
                  Create Account
                </Button>
              </Link>
              <Link href={`/login?next=${encodeURIComponent(`/invitations/${token}`)}`}>
                <Button variant="outline" className="w-full" data-testid="button-sign-in-to-accept">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
