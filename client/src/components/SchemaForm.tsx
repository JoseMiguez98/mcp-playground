import type { JSONSchemaProperty } from "../types";

interface Props {
  schema: {
    properties?: Record<string, JSONSchemaProperty>;
    required?: string[];
  };
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

function resolveType(prop: JSONSchemaProperty): string {
  if (prop.type) return prop.type;
  if (prop.anyOf) return prop.anyOf[0]?.type ?? "string";
  if (prop.oneOf) return prop.oneOf[0]?.type ?? "string";
  return "string";
}

function FieldInput({
  name,
  prop,
  required,
  value,
  onChange,
}: {
  name: string;
  prop: JSONSchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const type = resolveType(prop);

  if (prop.enum) {
    return (
      <select
        className="field-input"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— select —</option>
        {prop.enum.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (type === "boolean") {
    return (
      <div className="field-checkbox-row">
        <input
          type="checkbox"
          className="field-checkbox"
          id={`field-${name}`}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={`field-${name}`} style={{ fontSize: 12, color: "var(--text-2)" }}>
          {value ? "true" : "false"}
        </label>
      </div>
    );
  }

  if (type === "number" || type === "integer") {
    return (
      <input
        type="number"
        className="field-input"
        step={type === "integer" ? 1 : "any"}
        placeholder={prop.default !== undefined ? String(prop.default) : ""}
        value={value === undefined || value === "" ? "" : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : Number(v));
        }}
      />
    );
  }

  if (type === "array" || type === "object") {
    return (
      <textarea
        className="field-input"
        rows={3}
        placeholder={type === "array" ? "[]" : "{}"}
        value={value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.trim() === "") {
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(raw));
          } catch {
            onChange(raw); // keep raw for now, validated on submit
          }
        }}
      />
    );
  }

  // default: string
  const isLong = prop.description?.toLowerCase().includes("content") ||
                 prop.description?.toLowerCase().includes("text") ||
                 prop.description?.toLowerCase().includes("message");

  if (isLong) {
    return (
      <textarea
        className="field-input"
        rows={3}
        placeholder={prop.default !== undefined ? String(prop.default) : ""}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      className="field-input"
      placeholder={prop.default !== undefined ? String(prop.default) : ""}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function SchemaForm({ schema, values, onChange }: Props) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(properties);

  if (entries.length === 0) {
    return <p className="no-params">No parameters — this tool takes no input.</p>;
  }

  const update = (key: string, val: unknown) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <div className="schema-form">
      <div className="form-section-title">Parameters</div>
      {entries.map(([key, prop]) => {
        const type = resolveType(prop);
        return (
          <div key={key} className="field-group">
            <div className="field-label">
              {key}
              {required.has(key) && <span className="field-required">*</span>}
              <span className="field-type">{type}</span>
            </div>
            {prop.description && <div className="field-desc">{prop.description}</div>}
            <FieldInput
              name={key}
              prop={prop}
              required={required.has(key)}
              value={values[key]}
              onChange={(v) => update(key, v)}
            />
          </div>
        );
      })}
    </div>
  );
}
