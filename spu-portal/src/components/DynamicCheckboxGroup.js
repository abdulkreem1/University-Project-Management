import './DynamicCheckboxGroup.css';

export default function DynamicCheckboxGroup({ field, value, onChange }) {
  const options = field.options || [];
  const selected = Array.isArray(value) ? value : (value || '').split(',').filter(Boolean);
  const selectedSet = new Set(selected);

  const toggle = (option) => {
    const next = selectedSet.has(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option];
    onChange(next);
  };

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);

  return (
    <div className="dcg-wrap">
      <div className="dcg-toolbar">
        <span className="dcg-count">
          {selected.length} of {options.length} selected
        </span>
        {options.length > 1 && (
          <div className="dcg-actions">
            <button type="button" className="dcg-action" onClick={selectAll} disabled={selected.length === options.length}>
              Select all
            </button>
            <button type="button" className="dcg-action" onClick={clearAll} disabled={selected.length === 0}>
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="dcg-options" role="group" aria-label={field.label}>
        {options.map((option) => {
          const checked = selectedSet.has(option);
          return (
            <label key={option} className={`dcg-option ${checked ? 'dcg-option--checked' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
              />
              <span className="dcg-box" aria-hidden="true">{checked ? '✓' : ''}</span>
              <span className="dcg-label">{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
