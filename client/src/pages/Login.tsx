import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuthContext } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const nextPath = params.get("next") || "/dashboard";

  const { login, signup, loginPending, signupPending, user } = useAuthContext();
  const { toast } = useToast();
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    email: params.get("email") || "",
    password: "",
    name: "",
    phone: "",
  });
  const justAuthenticated = useRef(false);

  useEffect(() => {
    if (user && justAuthenticated.current) {
      setLocation(nextPath);
    }
  }, [user, setLocation, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      justAuthenticated.current = true;
      if (isSignup) {
        await signup({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone || undefined,
        });
        toast({ title: "Account created successfully!" });
      } else {
        await login({ email: formData.email, password: formData.password });
        toast({ title: "Welcome back!" });
      }
    } catch (error: any) {
      justAuthenticated.current = false;
      toast({
        title: isSignup ? "Signup failed" : "Login failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-xl font-bold">G</span>
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold">Golf Day OS</CardTitle>
              <CardDescription>Organize your golf events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={isSignup}
                  placeholder="Your full name"
                  data-testid="input-name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="you@example.com"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="••••••••"
                minLength={6}
                data-testid="input-password"
              />
            </div>

            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="input-phone"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loginPending || signupPending}
              data-testid="button-submit"
            >
              {loginPending || signupPending
                ? "Please wait..."
                : isSignup
                ? "Create Account"
                : "Log In"}
            </Button>

            {!isSignup && (
              <div className="text-center">
                <a
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-forgot-password"
                >
                  Forgot your password?
                </a>
              </div>
            )}

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-primary hover:underline"
                data-testid="button-toggle-mode"
              >
                {isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
