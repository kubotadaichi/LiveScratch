interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onGoogle: () => void;
  onGitHub: () => void;
}

export function AuthDialog({ open, onClose, onGoogle, onGitHub }: AuthDialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Sign in to save & share</h3>
        <p className="dialog-subtitle">
          Sign in to save your projects and share them with others.
        </p>
        <div className="dialog-actions-vertical">
          <button className="auth-btn google" onClick={onGoogle}>
            Continue with Google
          </button>
          <button className="auth-btn github" onClick={onGitHub}>
            Continue with GitHub
          </button>
        </div>
        <button className="dialog-close" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
