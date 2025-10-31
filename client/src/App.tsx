import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "./lib/AuthProvider";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Landing page */}
      <Route path="/" component={Home} />
      
      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {/* Dashboard */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>

      {/* Groups */}
      <Route path="/groups/new">
        <ProtectedRoute component={GroupNew} />
      </Route>
      <Route path="/groups/join">
        <ProtectedRoute component={JoinGroup} />
      </Route>
      <Route path="/groups/:id">
        <ProtectedRoute component={GroupDetails} />
      </Route>

      {/* Courses */}
      <Route path="/courses">
        <ProtectedRoute component={Courses} />
      </Route>

      {/* Events */}
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

      {/* Settings */}
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
