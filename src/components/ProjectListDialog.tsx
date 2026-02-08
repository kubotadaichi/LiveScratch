import type { ProjectMeta } from '@/hooks/useProject';

interface ProjectListDialogProps {
  open: boolean;
  onClose: () => void;
  projects: ProjectMeta[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function ProjectListDialog({
  open,
  onClose,
  projects,
  onSelect,
  onDelete,
  onNew,
}: ProjectListDialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog-wide" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>My Projects</h3>
          <button className="btn-small" onClick={onNew}>
            + New
          </button>
        </div>
        {projects.length === 0 ? (
          <p className="dialog-empty">No saved projects yet.</p>
        ) : (
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id} className="project-item">
                <button
                  className="project-item-main"
                  onClick={() => {
                    onSelect(p.id);
                    onClose();
                  }}
                >
                  <span className="project-title">{p.title}</span>
                  <span className="project-date">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </button>
                <button
                  className="project-item-delete"
                  onClick={() => onDelete(p.id)}
                  title="Delete"
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="dialog-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
