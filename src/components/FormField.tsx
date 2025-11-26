// src/components/FormField.tsx
import { useFormContext, type RegisterOptions } from 'react-hook-form';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  rows?: number; // For textarea
  children?: React.ReactNode; // For custom input elements or additional content
  validation?: RegisterOptions; // React Hook Form validation rules
}

function FormField({ name, label, type = 'text', placeholder, rows, children, validation }: FormFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name];

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-primary mb-1">
        {label}
      </label>
      {children ? (
        children // Render custom children if provided
      ) : type === 'textarea' ? (
        <textarea
          id={name}
          rows={rows}
          placeholder={placeholder}
          className="w-full rounded-md border-surface bg-surface p-2 text-text-primary placeholder-text-secondary focus:border-primary focus:ring-primary focus:outline-none"
          {...register(name, validation)}
        />
      ) : (
        <input
          type={type}
          id={name}
          placeholder={placeholder}
          className="w-full rounded-md border-surface bg-surface p-2 text-text-primary placeholder-text-secondary focus:border-primary focus:ring-primary focus:outline-none"
          {...register(name, validation)}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-400">{error.message?.toString()}</p>}
    </div>
  );
}

export default FormField;