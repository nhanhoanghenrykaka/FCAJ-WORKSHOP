import { Link, useNavigate } from "react-router-dom";
import "./Register.css";
import { useEffect, useMemo, useState } from "react";
import {
  authenticateWithGoogle,
  register,
  sendRegistrationOtp,
  verifyRegistrationOtp,
} from "../../api/authApi";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../../api/client";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import { useAuth } from "../../hooks/useAuth";

type RegisterErrors = {
  email?: string;
  otp?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  google?: string;
};

function Register() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendRemaining, setResendRemaining] = useState(0);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const normalizedEmail = email.trim().toLowerCase();
  const isGmail = useMemo(
    () => /^[^\s@]+@gmail\.com$/i.test(normalizedEmail),
    [normalizedEmail],
  );

  useEffect(() => {
    if (resendRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setResendRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendRemaining]);

  function resetVerification() {
    setOtp("");
    setOtpSent(false);
    setIsEmailVerified(false);
    setVerificationToken("");
    setResendRemaining(0);
    setErrors((current) => ({ ...current, otp: undefined }));
  }

  function handleEmailChange(value: string) {
    if (value !== email) {
      resetVerification();
    }
    setEmail(value);
    setErrors((current) => ({ ...current, email: undefined }));
  }

  async function handleSendOtp() {
    if (!normalizedEmail) {
      setErrors((current) => ({ ...current, email: "Gmail is required." }));
      return;
    }
    if (!isGmail) {
      setErrors((current) => ({
        ...current,
        email: "Use a valid @gmail.com address to register.",
      }));
      return;
    }
    if (resendRemaining > 0 || isSendingOtp) return;

    try {
      setIsSendingOtp(true);
      setErrors((current) => ({ ...current, email: undefined, otp: undefined }));
      const response = await sendRegistrationOtp(normalizedEmail);
      setOtpSent(true);
      setIsEmailVerified(false);
      setVerificationToken("");
      setOtp("");
      setResendRemaining(response.resendAfterSeconds || 60);
      toast.success("OTP sent to your Gmail inbox.");
    } catch (error) {
      setErrors((current) => ({
        ...current,
        email: getApiErrorMessage(error, "Could not send OTP."),
      }));
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpSent) {
      setErrors((current) => ({ ...current, otp: "Send an OTP first." }));
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setErrors((current) => ({
        ...current,
        otp: "Enter the 6-digit OTP from Gmail.",
      }));
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setErrors((current) => ({ ...current, otp: undefined }));
      const response = await verifyRegistrationOtp(normalizedEmail, otp.trim());
      if (!response.verified || !response.verificationToken) {
        throw new Error("The backend did not confirm Gmail verification.");
      }
      setVerificationToken(response.verificationToken);
      setIsEmailVerified(true);
      toast.success("Gmail verified successfully.");
    } catch (error) {
      setIsEmailVerified(false);
      setVerificationToken("");
      setErrors((current) => ({
        ...current,
        otp: getApiErrorMessage(error, "OTP verification failed."),
      }));
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    try {
      setIsGoogleSubmitting(true);
      setErrors((current) => ({ ...current, google: undefined }));
      const data = await authenticateWithGoogle(credential);
      loginUser(data.token, data.user);
      toast.success("Google account verified. Welcome to Shopsflow.");
      navigate("/", { replace: true });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        google: getApiErrorMessage(error, "Could not continue with Google."),
      }));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleCreateAccount(
    event: React.SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors: RegisterErrors = {};

    if (!normalizedEmail) {
      nextErrors.email = "Gmail is required.";
    } else if (!isGmail) {
      nextErrors.email = "Use a valid @gmail.com address to register.";
    } else if (!isEmailVerified || !verificationToken) {
      nextErrors.otp = "Verify the OTP sent to your Gmail before registering.";
    }
    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (!firstName.trim()) {
      nextErrors.firstName = "First name is required.";
    }
    if (!lastName.trim()) {
      nextErrors.lastName = "Last name is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: normalizedEmail,
        password,
        verificationToken,
      });
      toast.success("Account created successfully. You can sign in now.");
      navigate("/login");
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not create this account.");
      if (message.toLowerCase().includes("verification") || message.toLowerCase().includes("otp")) {
        setIsEmailVerified(false);
        setVerificationToken("");
        setErrors({ otp: message });
      } else {
        setErrors({ email: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <title>Create account - Shopsflow</title>
      <div className="auth-page register-page">
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
              to="/login"
              className="mono-sm muted"
              style={{
                border: "1px solid var(--line)",
                padding: "8px 14px",
                borderRadius: "999px",
                color: "var(--ink)",
              }}
            >
              Sign in -&gt;
            </Link>
          </div>

          <div className="auth-form-box">
            <div className="eyebrow mb-3">Create account</div>
            <h1>
              Make a <em>home</em>
              <br />
              for the <span className="signal">gear</span> you love.
            </h1>
            <p className="sub">
              Create your customer account instantly with Google, or verify your
              Gmail with OTP and choose a password.
            </p>

            <form className="auth-form" onSubmit={handleCreateAccount}>
              <div className="row-2">
                <div className="field">
                  <label className="field-label" htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    className="input"
                    placeholder="Mai"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                  {errors.firstName && (
                    <p className="field-error">{errors.firstName}</p>
                  )}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    className="input"
                    placeholder="Nguyen"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                  {errors.lastName && (
                    <p className="field-error">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="email">
                  Gmail
                </label>
                <div className="otp-email-row">
                  <input
                    id="email"
                    className="input"
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={email}
                    disabled={isEmailVerified}
                    onChange={(event) => handleEmailChange(event.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary otp-action-btn"
                    disabled={
                      isEmailVerified || isSendingOtp || resendRemaining > 0
                    }
                    onClick={handleSendOtp}
                  >
                    {isSendingOtp
                      ? "Sending..."
                      : resendRemaining > 0
                        ? `Resend ${resendRemaining}s`
                        : otpSent
                          ? "Resend OTP"
                          : "Send OTP"}
                  </button>
                </div>
                <span className="field-help">
                  Registration is limited to verified @gmail.com addresses.
                </span>
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              {otpSent && (
                <div className="field otp-verification-box">
                  <label className="field-label" htmlFor="otp">
                    Gmail verification code
                  </label>
                  <div className="otp-email-row">
                    <input
                      id="otp"
                      className="input otp-input"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      disabled={isEmailVerified}
                      onChange={(event) => {
                        setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                        setErrors((current) => ({ ...current, otp: undefined }));
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary otp-action-btn"
                      disabled={isEmailVerified || isVerifyingOtp}
                      onClick={handleVerifyOtp}
                    >
                      {isEmailVerified
                        ? "Verified"
                        : isVerifyingOtp
                          ? "Verifying..."
                          : "Verify OTP"}
                    </button>
                  </div>
                  {isEmailVerified && (
                    <div className="otp-status otp-status-success">
                      ✓ Gmail verified. You can create your account.
                    </div>
                  )}
                  {errors.otp && <p className="field-error">{errors.otp}</p>}
                </div>
              )}

              <div className="field">
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  placeholder="Choose something memorable"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <div className="checklist">
                  <span className={`row ${password.length >= 8 ? "met" : ""}`}>
                    <span className="dot"></span>
                    <span>At least 8 characters</span>
                  </span>
                  <span className={`row ${isEmailVerified ? "met" : ""}`}>
                    <span className="dot"></span>
                    <span>Gmail OTP verified</span>
                  </span>
                </div>
                {errors.password && (
                  <p className="field-error">{errors.password}</p>
                )}
              </div>

              <label className="check">
                <input type="checkbox" defaultChecked required />
                <span className="box">✓</span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--ink-3)",
                    lineHeight: 1.5,
                  }}
                >
                  I agree to the{" "}
                  <span style={{ color: "var(--ink)" }}>Terms of Service</span>{" "}
                  and{" "}
                  <span style={{ color: "var(--ink)" }}>Privacy Policy</span>.
                </span>
              </label>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block mt-3"
                disabled={isSubmitting || !isEmailVerified}
              >
                {isSubmitting ? (
                  <>
                    Creating account
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
                    Create my account
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
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

            <div className="divider-or" aria-hidden="true">
              <hr />
              <span>or continue with Google</span>
              <hr />
            </div>
            <GoogleSignInButton
              mode="signup"
              disabled={isGoogleSubmitting}
              onCredential={handleGoogleCredential}
            />
            {errors.google && <p className="field-error">{errors.google}</p>}
            <p className="google-terms-note">
              Continuing with Google creates a customer account using your verified
              Gmail profile. Admin accounts still use email and password.
            </p>

            <p className="auth-foot">
              Already with us? <Link to="/login">Sign in -&gt;</Link>
            </p>
          </div>

          <div className="legal">
            <span>© 2026 Shopsflow Studio</span>
            <span>Privacy · Terms</span>
          </div>
        </section>

        <aside className="auth-art-panel">
          <div className="auth-art-top">
            <span className="mono-sm">ACCOUNT / FEATURES</span>
            <span className="mono-sm">
              <span className="ind">●</span> AVAILABLE NOW
            </span>
          </div>

          <div className="benefits">
            <div className="benefit-block">
              <div className="n">01</div>
              <div>
                <h3>
                  Verify your <em>Gmail</em>
                  <br />
                  before joining.
                </h3>
                <p>
                  Shopsflow sends a one-time code to the Gmail address used for
                  registration before an account can be created.
                </p>
              </div>
            </div>
            <div className="benefit-block">
              <div className="n">02</div>
              <div>
                <h3>
                  Keep your <em>orders</em>
                  <br />
                  in one place.
                </h3>
                <p>
                  Review products, totals, dates and the current status for every
                  order associated with your account.
                </p>
              </div>
            </div>
            <div className="benefit-block">
              <div className="n">03</div>
              <div>
                <h3>
                  Share useful <em>reviews.</em>
                </h3>
                <p>
                  Publish product ratings after receiving eligible orders and
                  manage the rest of your customer activity from one account.
                </p>
              </div>
            </div>
          </div>

          <div className="art-foot">
            <div className="stat">
              <div className="n">01</div>
              <div className="l">Gmail OTP</div>
            </div>
            <div className="stat">
              <div className="n">02</div>
              <div className="l">Order history</div>
            </div>
            <div className="stat">
              <div className="n">03</div>
              <div className="l">Product reviews</div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default Register;
