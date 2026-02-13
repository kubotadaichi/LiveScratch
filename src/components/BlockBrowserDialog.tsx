import { useState, useEffect } from 'react';
import type { CustomBlockMeta } from '@/hooks/useCustomBlocks';

interface BlockBrowserDialogProps {
  open: boolean;
  onClose: () => void;
  myBlocks: CustomBlockMeta[];
  publicBlocks: CustomBlockMeta[];
  installedIds: Set<string>;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

export function BlockBrowserDialog({
  open, onClose, myBlocks, publicBlocks, installedIds,
  onInstall, onUninstall, onEdit, onDelete, onCreate, onRefresh,
}: BlockBrowserDialogProps) {
  const [tab, setTab] = useState<'my' | 'community'>('my');

  useEffect(() => {
    if (open) onRefresh();
  }, [open, onRefresh]);

  if (!open) return null;

  const blocks = tab === 'my' ? myBlocks : publicBlocks;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog-wide" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Custom Blocks</h3>
          <button onClick={onCreate} className="btn-small">+ New Block</button>
        </div>

        <div className="block-browser-tabs">
          <button
            className={`block-browser-tab ${tab === 'my' ? 'active' : ''}`}
            onClick={() => setTab('my')}
          >
            My Blocks
          </button>
          <button
            className={`block-browser-tab ${tab === 'community' ? 'active' : ''}`}
            onClick={() => setTab('community')}
          >
            Community
          </button>
        </div>

        <div className="block-browser-list">
          {blocks.length === 0 && (
            <div className="dialog-empty">
              {tab === 'my' ? 'No custom blocks yet. Create one!' : 'No community blocks yet.'}
            </div>
          )}
          {blocks.map(block => (
            <div key={block.id} className="block-browser-item">
              <div className="block-browser-item-info">
                <span className="block-browser-item-name">{block.name}</span>
                <span className="block-browser-item-desc">{block.description}</span>
                <span className="block-browser-item-meta">
                  {block.category} · {block.is_public ? 'Public' : 'Private'}
                </span>
              </div>
              <div className="block-browser-item-actions">
                {tab === 'my' && (
                  <>
                    <button onClick={() => onEdit(block.id)} className="btn-small">Edit</button>
                    <button
                      onClick={() => onDelete(block.id)}
                      className="btn-small"
                      style={{ background: '#e94560' }}
                    >
                      Del
                    </button>
                  </>
                )}
                {installedIds.has(block.id) ? (
                  <button onClick={() => onUninstall(block.id)} className="btn-small">
                    Remove
                  </button>
                ) : (
                  <button onClick={() => onInstall(block.id)} className="btn-small" style={{ background: 'var(--accent)' }}>
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="dialog-close">Close</button>
      </div>
    </div>
  );
}
