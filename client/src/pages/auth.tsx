import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, ArrowLeft } from "lucide-react";
import { openclawLogoLg } from "@/lib/logo";
import { apiRequest } from "@/lib/queryClient";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /[0-9]/.test(p) },
];

function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strength = passed / PASSWORD_RULES.length;
  const strengthLabel = strength <= 0.25 ? "Weak" : strength <= 0.5 ? "Fair" : strength <= 0.75 ? "Good" : "Strong";
  const strengthColor = strength <= 0.25 ? "bg-red-500" : strength <= 0.5 ? "bg-amber-500" : strength <= 0.75 ? "bg-yellow-400" : "bg-emerald-500";

  return (
    <div className="space-y-2 pt-1" data-testid="password-strength">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
        <span className={`text-[9px] font-semibold ${
          strength <= 0.25 ? "text-red-400" : strength <= 0.5 ? "text-amber-400" : strength <= 0.75 ? "text-yellow-400" : "text-emerald-400"
        }`} data-testid="password-strength-label">
          {strengthLabel}
        </span>
      </div>
      {/* Requirements checklist */}
      <div className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <div key={rule.label} className="flex items-center gap-1.5" data-testid={`password-rule-${rule.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className={`h-3 w-3 rounded-full flex items-center justify-center transition-colors ${met ? "bg-emerald-500" : "bg-muted"}`}>
                {met && <Check className="h-2 w-2 text-white" />}
              </div>
              <span className={`text-[10px] transition-colors ${met ? "text-emerald-400" : "text-muted-foreground"}`}>
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { login, register, loginError, registerError, isLoginPending, isRegisterPending } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [localLoginError, setLocalLoginError] = useState<string | null>(null);
  const [localRegError, setLocalRegError] = useState<string | null>(null);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Reset password state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage(null);
    setForgotError(null);
    setResetToken(null);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail });
      const data = await res.json();
      setForgotMessage(data.message);
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setResetTokenInput(data.resetToken);
      }
    } catch (err: any) {
      setForgotError(err.message || "Failed to process request");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);
    setResetError(null);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token: resetTokenInput, password: resetNewPassword });
      const data = await res.json();
      setResetMessage(data.message);
      // Auto-redirect to login after success
      setTimeout(() => {
        setShowForgotPassword(false);
        setShowResetPassword(false);
        setResetToken(null);
        setResetTokenInput("");
        setResetNewPassword("");
      }, 2000);
    } catch (err: any) {
      setResetError(err.message?.replace(/^\d+:\s*/, "") || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoginError(null);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setLocalLoginError(err.message?.replace(/^\d+:\s*/, "") || "Login failed");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalRegError(null);
    try {
      await register(regEmail, regUsername, regPassword);
    } catch (err: any) {
      setLocalRegError(err.message?.replace(/^\d+:\s*/, "") || "Registration failed");
    }
  };

  const displayLoginError = localLoginError || loginError;
  const displayRegError = localRegError || registerError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={openclawLogoLg} alt="ZeroClaw" className="h-20 w-auto object-contain drop-shadow-[0_0_12px_hsl(173,80%,50%,0.5)]" />
          <h1 className="mt-4 text-2xl font-bold tracking-wide text-foreground font-mono">
            ZeroClaw
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
            Dashboard Terminal
          </p>
        </div>

        <Card className="border border-primary/20 shadow-lg shadow-primary/5 bg-card">
          <CardHeader className="pb-2">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted" data-testid="auth-tabs">
                <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <CardContent className="p-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-xs text-muted-foreground">
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        data-testid="login-email"
                        className="bg-background border-border focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-xs text-muted-foreground">
                        Password
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        data-testid="login-password"
                        className="bg-background border-border focus:ring-primary"
                      />
                    </div>
                    {displayLoginError && (
                      <p className="text-xs text-destructive" data-testid="login-error">
                        {displayLoginError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoginPending}
                      data-testid="login-submit"
                    >
                      {isLoginPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
                      data-testid="forgot-password-link"
                    >
                      Forgot your password?
                    </button>
                  </form>
                </CardContent>
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                <CardContent className="p-0">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-xs text-muted-foreground">
                        Email
                      </Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="you@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        data-testid="register-email"
                        className="bg-background border-border focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-username" className="text-xs text-muted-foreground">
                        Username
                      </Label>
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="Choose a username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        required
                        minLength={3}
                        maxLength={30}
                        data-testid="register-username"
                        className="bg-background border-border focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-xs text-muted-foreground">
                        Password
                      </Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Min 8 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={8}
                        data-testid="register-password"
                        className="bg-background border-border focus:ring-primary"
                      />
                      {/* Password strength indicator */}
                      {regPassword.length > 0 && (
                        <PasswordStrengthMeter password={regPassword} />
                      )}
                    </div>
                    {displayRegError && (
                      <p className="text-xs text-destructive" data-testid="register-error">
                        {displayRegError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isRegisterPending || !isPasswordValid(regPassword)}
                      data-testid="register-submit"
                    >
                      {isRegisterPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Forgot Password Overlay */}
        {showForgotPassword && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50">
            <Card className="w-full max-w-md border border-primary/20 shadow-lg shadow-primary/5 bg-card mx-4">
              <CardHeader className="pb-2">
                <button
                  onClick={() => { setShowForgotPassword(false); setShowResetPassword(false); setResetToken(null); setForgotMessage(null); setForgotError(null); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
                  data-testid="back-to-login"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </button>

                {!showResetPassword ? (
                  /* Step 1: Enter email */
                  <div>
                    <h2 className="text-lg font-bold font-mono text-foreground">Reset Password</h2>
                    <p className="text-xs text-muted-foreground mt-1">Enter your email to receive a reset token</p>
                  </div>
                ) : (
                  /* Step 2: Enter token + new password */
                  <div>
                    <h2 className="text-lg font-bold font-mono text-foreground">Set New Password</h2>
                    <p className="text-xs text-muted-foreground mt-1">Enter the reset token and your new password</p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!showResetPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-xs text-muted-foreground">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        data-testid="forgot-email"
                        className="bg-background border-border focus:ring-primary"
                      />
                    </div>
                    {forgotError && <p className="text-xs text-destructive" data-testid="forgot-error">{forgotError}</p>}
                    {forgotMessage && (
                      <div className="space-y-2">
                        <p className="text-xs text-emerald-400" data-testid="forgot-success">{forgotMessage}</p>
                        {resetToken && (
                          <div className="p-2 rounded bg-muted border border-border">
                            <p className="text-[10px] text-muted-foreground mb-1">Your reset token (copy this):</p>
                            <code className="text-xs text-primary break-all select-all" data-testid="reset-token-display">{resetToken}</code>
                          </div>
                        )}
                        <Button
                          type="button"
                          onClick={() => setShowResetPassword(true)}
                          className="w-full"
                          data-testid="proceed-to-reset"
                        >
                          Enter Reset Token
                        </Button>
                      </div>
                    )}
                    {!forgotMessage && (
                      <Button type="submit" className="w-full" disabled={forgotLoading} data-testid="forgot-submit">
                        {forgotLoading ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                        ) : "Send Reset Token"}
                      </Button>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-token" className="text-xs text-muted-foreground">Reset Token</Label>
                      <Input
                        id="reset-token"
                        type="text"
                        placeholder="Paste your reset token"
                        value={resetTokenInput}
                        onChange={(e) => setResetTokenInput(e.target.value)}
                        required
                        data-testid="reset-token-input"
                        className="bg-background border-border focus:ring-primary font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-new-password" className="text-xs text-muted-foreground">New Password</Label>
                      <Input
                        id="reset-new-password"
                        type="password"
                        placeholder="Min 8 characters"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        required
                        minLength={8}
                        data-testid="reset-new-password"
                        className="bg-background border-border focus:ring-primary"
                      />
                      {resetNewPassword.length > 0 && <PasswordStrengthMeter password={resetNewPassword} />}
                    </div>
                    {resetError && <p className="text-xs text-destructive" data-testid="reset-error">{resetError}</p>}
                    {resetMessage && <p className="text-xs text-emerald-400" data-testid="reset-success">{resetMessage}</p>}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={resetLoading || !isPasswordValid(resetNewPassword)}
                      data-testid="reset-submit"
                    >
                      {resetLoading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting...</>
                      ) : "Reset Password"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
