import { useTags } from '@/hooks/useTags';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler, FormProvider } from 'react-hook-form';
import { ERROR_MESSAGES } from '@/constants';
import FormField from '@/components/FormField';

const TagFormSchema = z.object({
  name: z.string().min(1, ERROR_MESSAGES.TAG_NAME_REQUIRED),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, ERROR_MESSAGES.INVALID_COLOR_FORMAT),
});

type TagFormInputs = z.infer<typeof TagFormSchema>;

function TagForm() {
  const { addTag } = useTags();

  const methods = useForm<TagFormInputs>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: {
      name: '',
      color: '#3b82f6', // Default to a nice blue
    }
  });

  const { handleSubmit } = methods;

  const onSubmit: SubmitHandler<TagFormInputs> = async (data) => {
    await addTag(data.name.trim(), data.color);
    methods.reset(); // Reset form after successful submission
  };

  return (
    <div className="rounded-xl border border-surface bg-surface p-4">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Create New Tag</h2>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField name="name" label="Tag Name" type="text" placeholder="e.g., 'React'" />
          
          <FormField name="color" label="Tag Color">
            <div className="flex items-center gap-2">
              <input
                type="color" id="color"
                className="h-10 w-14 cursor-pointer rounded-md border-surface bg-surface p-1"
                {...methods.register("color")}
              />
              <input
                type="text"
                className="w-full rounded-md border-surface bg-surface p-2 text-text-primary placeholder-text-secondary focus:border-primary focus:ring-primary focus:outline-none"
                {...methods.register("color")}
              />
            </div>
          </FormField>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <Plus size={16} />
            Create Tag
          </button>
        </form>
      </FormProvider>
    </div>
  );
}

export default TagForm;