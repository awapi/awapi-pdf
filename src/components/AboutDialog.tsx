import { useCallback } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

const APP_VERSION = "0.3.1";
const REPO_URL = "https://github.com/awapi/awapi-pdf";
const PROFILE_URL = "https://github.com/omeryesil";

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  const handleOpenRepo = useCallback(() => {
    openUrl(REPO_URL);
  }, []);

  const handleOpenProfile = useCallback(() => {
    openUrl(PROFILE_URL);
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog about-dialog">
        <div className="about-app-name">AwapiPDF</div>
        <div className="about-info-grid">
          <span className="about-info-label">Version:</span>
          <span className="about-info-value">{APP_VERSION}</span>
          <span className="about-info-label">Platform:</span>
          <span className="about-info-value">{navigator.platform}</span>
        </div>
        <p className="about-description">
          A fast, lightweight, universal PDF reader &amp; editor.
          <br />
          <span className="about-link" onClick={handleOpenRepo} role="button" tabIndex={0}>
            github.com/awapi/awapi-pdf
          </span>
        </p>
        <p className="about-maintainer">
          Maintainer: Omer Yesil
          <br />
          <span className="about-link" onClick={handleOpenProfile} role="button" tabIndex={0}>
            github.com/omeryesil
          </span>
        </p>
        <div className="dialog-actions about-actions">
          <button className="dialog-btn-secondary" onClick={handleOpenRepo}>
            Open Repo
          </button>
          <button className="dialog-btn-secondary" onClick={handleOpenProfile}>
            Open Profile
          </button>
          <button className="dialog-btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
