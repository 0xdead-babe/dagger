import { useFormContext, type RegisterOptions } from "react-hook-form";

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
  children?: React.ReactNode;
  validation?: RegisterOptions;
}

function FormField({
  name,
  label,
  type = "text",
  placeholder,
  hint,
  rows,
  children,
  validation,
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = errors[name];

  return (
    <div>
      <label
        htmlFor={name}
        className="field-label"
      >
        {label}
      </label>
      {children ? (
        children
      ) : type === "textarea" ? (
        <textarea
          id={name}
          rows={rows}
          placeholder={placeholder}
          className="field-input min-h-[96px] resize-y"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
          {...register(name, validation)}
        />
      ) : (
        <input
          type={type}
          id={name}
          placeholder={placeholder}
          className="field-input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
          {...register(name, validation)}
        />
      )}
      {hint && !error && <p id={`${name}-hint`} className="field-hint">{hint}</p>}
      {error && (
        <p id={`${name}-error`} role="alert" className="field-error">{error.message?.toString()}</p>
      )}
    </div>
  );
}

export default FormField;
