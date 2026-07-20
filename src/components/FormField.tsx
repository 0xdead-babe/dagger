import { useFormContext, type RegisterOptions } from "react-hook-form";

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  rows?: number;
  children?: React.ReactNode;
  validation?: RegisterOptions;
}

function FormField({
  name,
  label,
  type = "text",
  placeholder,
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
        className="block text-[10.5px] uppercase tracking-wider text-[#6E6455] mb-1.5 font-semibold"
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
          className="w-full rounded-md border border-border bg-surface-raised p-2.5 text-text-primary placeholder-text-secondary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-all"
          {...register(name, validation)}
        />
      ) : (
        <input
          type={type}
          id={name}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-surface-raised p-2.5 text-text-primary placeholder-text-secondary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-all"
          {...register(name, validation)}
        />
      )}
      {error && (
        <p className="mt-1 text-sm text-red-400">{error.message?.toString()}</p>
      )}
    </div>
  );
}

export default FormField;
