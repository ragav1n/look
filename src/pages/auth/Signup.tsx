import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserProvider";
import AuthShell, { AuthField, GoogleButton, authInputClass } from "./AuthShell";

export default function Signup() {
  const { signup, login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  /* AccountLayout stashes where the visitor was headed before the guard
     bounced them here. Without this, someone who clicked Wishlist while signed
     out lands on Profile, and a bookmarked order link is lost entirely. */
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const destination = from ?? "/account/profile";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    signup(name, email, phone);
    navigate(destination, { replace: true });
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join LOOK for a personalised experience"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <AuthField label="Full name">
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={authInputClass}
          />
        </AuthField>
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
        <AuthField label="Phone">
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 90000 00000"
            className={authInputClass}
          />
        </AuthField>
        <AuthField label="Password">
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            className={authInputClass}
          />
        </AuthField>
        <button
          type="submit"
          className="h-[50px] cursor-pointer rounded-btn bg-white text-[15px] font-medium text-black transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          Create Account
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton
        label="Sign up with Google"
        onClick={() => {
          login("guest@look.in", "Guest");
          navigate(destination, { replace: true });
        }}
      />
    </AuthShell>
  );
}
