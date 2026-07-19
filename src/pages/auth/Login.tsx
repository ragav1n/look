import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserProvider";
import AuthShell, { AuthField, GoogleButton, authInputClass } from "./AuthShell";

export default function Login() {
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  /* AccountLayout stashes where the visitor was headed before the guard
     bounced them here. Without this, someone who clicked Wishlist while signed
     out lands on Profile, and a bookmarked order link is lost entirely. */
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const destination = from ?? "/account/profile";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email);
    navigate(destination, { replace: true });
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your account"
      footer={
        <>
          Don’t have an account?{" "}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <AuthField label="Email">
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={authInputClass}
          />
        </AuthField>
        <AuthField label="Password">
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={authInputClass}
          />
        </AuthField>
        <div className="text-right">
          <button type="button" className="text-[13px] text-muted hover:text-accent">
            Forgot password?
          </button>
        </div>
        <button
          type="submit"
          className="h-[50px] cursor-pointer rounded-btn bg-white text-[15px] font-medium text-black transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          Sign In
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton
        label="Continue with Google"
        onClick={() => {
          login("guest@look.in", "Guest");
          navigate(destination, { replace: true });
        }}
      />
    </AuthShell>
  );
}
