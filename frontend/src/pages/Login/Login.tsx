import { useState } from "react";
import "./Login.css";
import { authenticateWithGoogle, login } from "../../api/authApi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../api/client";
import GoogleSignInButton from "../../components/GoogleSignInButton";

type LoginErrors = {
  email?: string;
  password?: string;
  google?: string;
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";
  
  async function handleGoogleCredential(credential: string) {
    try {
      setIsGoogleSubmitting(true);
      setErrors((current) => ({ ...current, google: undefined }));
      const data = await authenticateWithGoogle(credential);
      loginUser(data.token, data.user);
      navigate(data.user.role === "ADMIN" ? "/admin" : from, { replace: true });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        google: getApiErrorMessage(error, "Could not sign in with Google."),
      }));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    try {
      setIsSubmitting(true);
      const data = await login({ email: email.trim(), password });
      loginUser(data.token, data.user);
      const destination = data.user.role === "ADMIN" ? "/admin" : from;
      navigate(destination, { replace: true });
    } catch (error) {
      setErrors({
        password: getApiErrorMessage(error, "Invalid email or password."),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <title>Sign in - Shopsflow</title>
      <div className="auth-page">
        <section className="auth-form-panel">
          <div className="auth-top">
            <Link to="/" className="nav-logo">
              <svg className="mark" viewBox="0 0 26 26" fill="none">
                <rect
                  x="0.5"
                  y="0.5"
                  width="25"
                  height="25"
                  rx="6"
                  fill="#0F0F0F"
                />
                <path
                  d="M9 9 H16 A2 2 0 0 1 18 11 V11 A2 2 0 0 1 16 13 H10 A2 2 0 0 0 8 15 V15 A2 2 0 0 0 10 17 H17"
                  stroke="#FF4D1F"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx="17" cy="17" r="1.2" fill="#FF4D1F" />
              </svg>
              shopsflow
            </Link>

            <Link
              to="/register"
              className="mono-sm muted"
              style={{
                border: "1px solid var(--line)",
                padding: "8px 14px",
                borderRadius: "999px",
                color: "var(--ink)",
              }}
            >
              Create account →
            </Link>
          </div>

          <div className="auth-form-box">
            <div className="eyebrow mb-3">§ Welcome back</div>
            <h1>
              Sign in to <em>your</em>
              <br />
              studio.
            </h1>
            <p className="sub">
              Sign in with your customer Google account or use your Shopsflow
              email and password.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field">
                <div className="field-row">
                  <label className="field-label">Email</label>
                </div>
                <input
                  id="email"
                  name="email"
                  className="input"
                  type="email"
                  placeholder="you@studio.com"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              <div className="field">
                <div className="field-row">
                  <label className="field-label">Password</label>
                </div>
                <input
                  id="password"
                  name="password"
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {errors.password && (
                  <p className="field-error">{errors.password}</p>
                )}
              </div>

              <div className="divider-or login-google-divider" aria-hidden="true">
                <hr />
                <span>or sign in with Google</span>
                <hr />
              </div>

              <GoogleSignInButton
                mode="signin"
                disabled={isGoogleSubmitting}
                onCredential={handleGoogleCredential}
              />
              {errors.google && <p className="field-error">{errors.google}</p>}

              <p className="mono-sm muted mt-2">
                This sign-in belongs to this browser tab and stays after refresh.
              </p>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    Signing in
                    <svg
                      className="spin-icon"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <circle
                        cx="7"
                        cy="7"
                        r="5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        opacity="0.25"
                      />
                      <path
                        d="M12 7a5 5 0 0 0-5-5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    Sign in
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <p className="auth-foot">
              New around here? <Link to="/register">Create an account →</Link>
            </p>
          </div>

          <div className="legal">
            <span>© 2026 Shopsflow Studio</span>
            <span>Privacy · Terms</span>
          </div>
        </section>
      </div>
    </>
  );
}

export default Login;
