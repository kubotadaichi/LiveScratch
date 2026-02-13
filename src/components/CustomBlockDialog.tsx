import { useState, useCallback } from 'react';

interface BlockInput {
  type: 'field_dropdown' | 'field_number' | 'field_text';
  name: string;
  label: string;
  options?: string[][];
}

interface CustomBlockDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (block: {
    name: string;
    description: string;
    category: string;
    colour: number;
    definition: Record<string, unknown>;
    generator_code: string;
    is_public: boolean;
  }) => void;
  initial?: {
    name: string;
    description: string;
    category: string;
    colour: number;
    definition: Record<string, unknown>;
    generator_code: string;
    is_public: boolean;
  };
}

export function CustomBlockDialog({ open, onClose, onSave, initial }: CustomBlockDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'Custom');
  const [colour, setColour] = useState(initial?.colour ?? 230);
  const [inputs, setInputs] = useState<BlockInput[]>(
    (initial?.definition as { inputs?: BlockInput[] })?.inputs ?? []
  );
  const [hasOutput, setHasOutput] = useState(
    (initial?.definition as { hasOutput?: boolean })?.hasOutput ?? false
  );
  const [hasPrevious, setHasPrevious] = useState(
    (initial?.definition as { hasPrevious?: boolean })?.hasPrevious ?? true
  );
  const [hasNext, setHasNext] = useState(
    (initial?.definition as { hasNext?: boolean })?.hasNext ?? true
  );
  const [generatorCode, setGeneratorCode] = useState(
    initial?.generator_code ?? '// fields: Record<string, unknown>, blockId: string\n// Return a Track, Effect, or VisualShape object\nreturn { type: "track", id: blockId, source: { type: "synth", waveform: "sine" }, pattern: { type: "note", pitch: "C4" }, effects: [] };'
  );
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);

  const addInput = useCallback((type: BlockInput['type']) => {
    setInputs(prev => [...prev, {
      type,
      name: `FIELD_${prev.length}`,
      label: type === 'field_dropdown' ? 'Option' : type === 'field_number' ? 'Value' : 'Text',
      ...(type === 'field_dropdown' ? { options: [['Option A', 'a'], ['Option B', 'b']] } : {}),
    }]);
  }, []);

  const removeInput = useCallback((index: number) => {
    setInputs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description,
      category,
      colour,
      definition: { inputs, hasOutput, hasPrevious, hasNext, colour, tooltip: description },
      generator_code: generatorCode,
      is_public: isPublic,
    });
    onClose();
  }, [name, description, category, colour, inputs, hasOutput, hasPrevious, hasNext, generatorCode, isPublic, onSave, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog-wide custom-block-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{initial ? 'Edit Block' : 'Create Custom Block'}</h3>
        </div>

        <div className="custom-block-form">
          <label>
            Name
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="My Block" />
          </label>

          <label>
            Description
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this block do?" />
          </label>

          <div className="custom-block-row">
            <label>
              Category
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Custom">Custom</option>
                <option value="Source">Source</option>
                <option value="Pattern">Pattern</option>
                <option value="Effect">Effect</option>
                <option value="Visual">Visual</option>
              </select>
            </label>
            <label>
              Colour
              <input type="number" value={colour} onChange={e => setColour(Number(e.target.value))} min={0} max={360} />
            </label>
          </div>

          <fieldset>
            <legend>Connections</legend>
            <label className="checkbox-label">
              <input type="checkbox" checked={hasOutput} onChange={e => setHasOutput(e.target.checked)} />
              Output (connects to input)
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={hasPrevious} onChange={e => setHasPrevious(e.target.checked)} />
              Previous statement
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={hasNext} onChange={e => setHasNext(e.target.checked)} />
              Next statement
            </label>
          </fieldset>

          <fieldset>
            <legend>Input Fields</legend>
            {inputs.map((input, i) => (
              <div key={i} className="custom-block-input-row">
                <span>{input.type.replace('field_', '')}</span>
                <input
                  type="text"
                  value={input.label}
                  onChange={e => setInputs(prev => prev.map((inp, j) => j === i ? { ...inp, label: e.target.value } : inp))}
                  placeholder="Label"
                />
                <input
                  type="text"
                  value={input.name}
                  onChange={e => setInputs(prev => prev.map((inp, j) => j === i ? { ...inp, name: e.target.value } : inp))}
                  placeholder="Field name"
                />
                <button onClick={() => removeInput(i)} className="btn-small" style={{ background: '#e94560' }}>x</button>
              </div>
            ))}
            <div className="custom-block-add-inputs">
              <button onClick={() => addInput('field_number')} className="btn-small">+ Number</button>
              <button onClick={() => addInput('field_text')} className="btn-small">+ Text</button>
              <button onClick={() => addInput('field_dropdown')} className="btn-small">+ Dropdown</button>
            </div>
          </fieldset>

          <label>
            Generator Code (JS)
            <textarea
              value={generatorCode}
              onChange={e => setGeneratorCode(e.target.value)}
              rows={6}
              className="custom-block-code"
            />
          </label>

          <label className="checkbox-label">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            Share publicly
          </label>
        </div>

        <div className="custom-block-dialog-actions">
          <button onClick={handleSave} className="btn-small" style={{ background: 'var(--accent)' }}>
            Save Block
          </button>
          <button onClick={onClose} className="dialog-close">Cancel</button>
        </div>
      </div>
    </div>
  );
}
