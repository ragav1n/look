import { useLocation, useSearchParams } from "react-router-dom";
import { useUser } from "@/context/UserProvider";
import AuthShell, { LaunchButton } from "./AuthShell";

export default function Login() {
  const { login } = useUser();
  const location = useLocation();
  const [params] = useSearchParams();

  /* AccountLayout stashes where the visitor was headed before the guard bounced
     them here, so signing in returns them there rather than to Profile. */
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  /* The BFF callback sends failures back here as ?auth_error=… */
  const failed = params.has("auth_error");

  return (
    <AuthShell
      title="Sign in to LOOK"
      subtitle="No password needed — we email you a one-time code."
      footer={<>New to LOOK? Continue above — your account is created in the same step.</>}
    >
      {failed && (
        <p
          className="mb-5 rounded-btn border border-sale/40 bg-sale/10 px-4 py-3 text-[14px] text-sale"
          role="alert"
        >
          We couldn’t sign you in. Please try again.
        </p>
      )}

      <LaunchButton label="Continue with LOOK" onClick={() => login(from)} />

      <p className="mt-4 text-center text-[13px] text-muted">
        You’ll confirm your email with a secure one-time code, then land right back here.
      </p>
    </AuthShell>
  );
}
