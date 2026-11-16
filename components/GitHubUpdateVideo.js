'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const VIDEO_SRC = '/videos/synth-github-update.mp4';

export function GitHubUpdateVideoPlayer({ className = '' }) {
  return (
    <div className={`gh-update-video ${className}`.trim()}>
      <video controls playsInline preload="metadata" aria-label="SYNTHCODE GitHub integration walkthrough">
        <source src={VIDEO_SRC} type="video/mp4" />
        Your browser does not support the video element.
      </video>
    </div>
  );
}

export function GitHubUpdateReadMore({ href = '/dev-updates/synthcode-github-repository-workflow' }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => closeRef.current?.focus());
    } else if (!open && dialog?.open) {
      dialog.close();
    }
  }, [open]);

  function closeDialog() {
    dialogRef.current?.querySelector('video')?.pause();
    if (dialogRef.current?.open) dialogRef.current.close();
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="du-btn gh-update-read-more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Read more <span aria-hidden="true">→</span>
      </button>
      <dialog
        className="gh-update-dialog"
        ref={dialogRef}
        aria-labelledby="gh-update-dialog-title"
        onClose={() => {
          dialogRef.current?.querySelector('video')?.pause();
          setOpen(false);
        }}
        onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}
      >
        <div className="gh-update-dialog-content">
          <header className="gh-update-dialog-head">
            <div>
              <span className="gh-update-dialog-kicker">FEATURE WALKTHROUGH</span>
              <h2 id="gh-update-dialog-title">GitHub in SYNTHCODE</h2>
              <p>See how SYNTHCODE imports a selected repository, edits its project files, and prepares a pull request for review.</p>
            </div>
            <button ref={closeRef} type="button" className="gh-update-dialog-close" aria-label="Close video" onClick={closeDialog}>×</button>
          </header>
          <GitHubUpdateVideoPlayer className="gh-update-modal-player" />
          <footer className="gh-update-dialog-footer">
            <span>46-second walkthrough</span>
            <Link href={href} className="gh-update-full-link">Read the full update <span aria-hidden="true">→</span></Link>
          </footer>
        </div>
      </dialog>
    </>
  );
}
