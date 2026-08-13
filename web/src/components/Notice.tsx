// Loading and failure, kept in the archive's voice rather than a spinner and a
// stack trace.

interface Props {
  kind: 'loading' | 'error';
  title: string;
  body?: string;
}

export function Notice({ kind, title, body }: Props) {
  return (
    <div
      className={`notice notice--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <p className="notice__title">{title}</p>
      {body && <p className="notice__body">{body}</p>}
    </div>
  );
}

export const Consulting = () => (
  <Notice kind="loading" title="The archivist is consulting the register…" />
);
