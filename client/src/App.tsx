import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "./lib/AuthProvider";
import { Navigation } from "@/components/Navigation";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import GroupNew from "@/pages/GroupNew";
import GroupDetails from "@/pages/GroupDetails";
import JoinGroup from "@/pages/JoinGroup";
import Courses from "@/pages/Courses";
import EventNew from "@/pages/EventNew";
import EventDetails from "@/pages/EventDetails";
import PollView from "@/pages/PollView";
import RSVPPage from "@/pages/RSVPPage";
import Pairings from "@/pages/Pairings";
import Settings from "@/pages/Settings";
import AcceptInvitation from "@/pages/AcceptInvitation";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user } = useAuthContext();

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function Router() {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />

      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>

      <Route path="/groups/new">
        <ProtectedRoute component={GroupNew} />
      </Route>
      <Route path="/groups/join">
        <ProtectedRoute component={JoinGroup} />
      </Route>
      <Route path="/groups/:id">
        <ProtectedRoute component={GroupDetails} />
      </Route>

      <Route path="/courses">
        <ProtectedRoute component={Courses} />
      </Route>

      <Route path="/groups/:groupId/events/new">
        <ProtectedRoute component={EventNew} />
      </Route>
      <Route path="/events/:id">
        <ProtectedRoute component={EventDetails} />
      </Route>
      <Route path="/events/:id/polls">
        <ProtectedRoute component={PollView} />
      </Route>
      <Route path="/events/:id/rsvp">
        <ProtectedRoute component={RSVPPage} />
      </Route>
      <Route path="/events/:id/pairings">
        <ProtectedRoute component={Pairings} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      <Route path="/invitations/:token" component={AcceptInvitation} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="h-screen flex flex-col overflow-hidden">
            <Navigation />
            <div className="flex-1 overflow-y-auto bg-background">
              <Router />
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
