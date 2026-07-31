import { useEffect, useRef, useState } from "react";
import "./GoogleSignInButton.css";

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
};

type GoogleButtonConfiguration = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
  logo_alignment?: "left" | "center";
};

type GoogleAccountsIdApi = {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsIdApi;
      };
    };
  }
}

type GoogleSignInButtonProps = {
  onCredential: (credential: string) => void | Promise<void>;
  disabled?: boolean;
  mode?: "signup" | "signin";
};

const GOOGLE_SCRIPT_ID = "shopsflow-google-identity-script";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function ensureGoogleScript(onReady: () => void, onError: () => void) {
  if (window.google?.accounts?.id) {
    onReady();
    return () => undefined;
  }

  let script = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  const handleLoad = () => onReady();
  const handleError = () => onError();

  if (!script) {
    script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  script.addEventListener("load", handleLoad);
  script.addEventListener("error", handleError);

  return () => {
    script?.removeEventListener("load", handleLoad);
    script?.removeEventListener("error", handleError);
  };
}

export default function GoogleSignInButton({
  onCredential,
  disabled = false,
  mode = "signin",
}: GoogleSignInButtonProps) {
  const buttonHostRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  const [loadError, setLoadError] = useState(false);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || disabled) return;

    let active = true;
    const cleanup = ensureGoogleScript(
      () => {
        if (!active || !buttonHostRef.current || !window.google?.accounts?.id) return;
        setLoadError(false);
        buttonHostRef.current.replaceChildren();
        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            const credential = response.credential?.trim();
            if (credential) {
              void callbackRef.current(credential);
            }
          },
        });
        const width = Math.max(240, Math.min(400, buttonHostRef.current.clientWidth || 360));
        window.google.accounts.id.renderButton(buttonHostRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: mode === "signup" ? "signup_with" : "signin_with",
          shape: "pill",
          width,
          logo_alignment: "left",
        });
      },
      () => {
        if (active) setLoadError(true);
      },
    );

    return () => {
      active = false;
      cleanup();
    };
  }, [clientId, disabled, mode]);

  if (!clientId) {
    return (
      <div className="google-auth-unavailable" role="status">
        Google sign-in is not configured yet.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="google-auth-unavailable" role="alert">
        Could not load Google Sign-In. Check your internet connection and try again.
      </div>
    );
  }

  return (
    <div className={`google-auth-shell ${disabled ? "is-disabled" : ""}`}>
      <div ref={buttonHostRef} className="google-auth-host" aria-busy={disabled} />
      {disabled && <div className="google-auth-loading">Connecting to Google...</div>}
    </div>
  );
}
