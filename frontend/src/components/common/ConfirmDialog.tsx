import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  inputLabel?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  onInputChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  inputLabel,
  inputValue = "",
  inputPlaceholder,
  onInputChange,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="app-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="app-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="app-dialog-head">
          <p className="section-kicker">Shopsflow</p>
          <h2 id="app-dialog-title">{title}</h2>
        </div>
        {message && <div className="app-dialog-message">{message}</div>}
        {inputLabel && (
          <label className="form-field app-dialog-field">
            <span>{inputLabel}</span>
            <textarea
              rows={3}
              value={inputValue}
              placeholder={inputPlaceholder}
              onChange={(event) => onInputChange?.(event.target.value)}
              autoFocus
            />
          </label>
        )}
        <div className="app-dialog-actions">
          <button type="button" className="button button-secondary" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
          <button
            type="button"
            className={`button ${danger ? "button-danger" : "button-primary"}`}
            disabled={busy || Boolean(inputLabel && !inputValue.trim())}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
