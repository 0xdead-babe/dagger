import { useState, useEffect } from 'react';
import { useResources } from '@/hooks/useResources';
import { useTags } from '@/hooks/useTags';
import type { Resource } from '@/db/db';
import { Check, Loader2, Save } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, type SubmitHandler, FormProvider } from 'react-hook-form';
import { fetchPageTitle } from '@/utils/fetchPageTitle';
import { ERROR_MESSAGES } from '@/constants';
import FormField from '@/components/FormField';

const BookmarkFormSchema = z.object({
  url: z.string().url(ERROR_MESSAGES.INVALID_URL).min(1, ERROR_MESSAGES.URL_REQUIRED),
  title: z.string().min(1, ERROR_MESSAGES.TITLE_REQUIRED),
  description: z.string().optional(),
  read: z.boolean(),
  tagIds: z.array(z.number()), // Explicitly required array
});

type BookmarkFormInputs = z.infer<typeof BookmarkFormSchema>;

interface BookmarkFormProps {
  initialResource?: Resource;
  onSave?: () => void;
}

function BookmarkForm({ initialResource, onSave }: BookmarkFormProps) {
  const { addResource, updateResource } = useResources();
  const { tags } = useTags();

  const methods = useForm<BookmarkFormInputs>({
    resolver: zodResolver(BookmarkFormSchema),
    defaultValues: {
      url: initialResource?.url || '',
      title: initialResource?.title || '',
      description: initialResource?.description || '',
      read: initialResource?.read || false,
      tagIds: initialResource?.tagIds || [],
    }
  });

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = methods;

  const url = watch('url');
  const title = watch('title');

  const [loadingTitle, setLoadingTitle] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');

  useEffect(() => {
    const fetchTitle = async () => {
      const currentUrl = watch('url'); // Get current URL from react-hook-form
      if (currentUrl && (currentUrl.startsWith('http://') || currentUrl.startsWith('https://'))) {
        setLoadingTitle(true);
        setErrorTitle('');
        try {
          const detectedTitle = await fetchPageTitle(currentUrl);
          if (detectedTitle) {
            setValue('title', detectedTitle, { shouldValidate: true });
          } else {
            setErrorTitle(ERROR_MESSAGES.TITLE_NOT_DETECTED);
          }
        } catch (error) {
          console.error("Error fetching title:", error);
          setErrorTitle(ERROR_MESSAGES.NETWORK_ERROR);
        } finally {
          setLoadingTitle(false);
        }
      } else {
        setValue('title', '', { shouldValidate: true }); // Clear title if URL is invalid
        setErrorTitle('');
      }
    };
    if (!initialResource && url && !title) {
      const handler = setTimeout(() => fetchTitle(), 500);
      return () => clearTimeout(handler);
    }
  }, [url, initialResource, title, setValue, watch]);

  const onSubmit: SubmitHandler<BookmarkFormInputs> = async (data) => {
    if (initialResource?.id) {
      await updateResource(initialResource.id, data);
    } else {
      await addResource(data);
    }
    if (onSave) onSave();
  };

  const handleTagToggle = (tagId: number) => {
    const currentTagIds = watch('tagIds');
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];
    setValue('tagIds', newTagIds, { shouldValidate: true });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-text-primary mb-1">
            URL
          </label>
          <div className="relative">
            <input
              type="url" id="url" placeholder="https://example.com"
              className="w-full rounded-md border-surface bg-surface p-2 text-text-primary placeholder-text-secondary focus:border-primary focus:ring-primary focus:outline-none"
              {...methods.register("url")}
            />
            {loadingTitle && <Loader2 className="absolute right-2 top-2 h-5 w-5 animate-spin text-text-secondary" />}
          </div>
          {errors.url && <p className="mt-1 text-sm text-red-400">{errors.url.message}</p>}
          {errorTitle && <p className="mt-1 text-sm text-red-400">{errorTitle}</p>}
        </div>

        <FormField name="title" label="Title" type="text" placeholder="Bookmark Title" />

        <FormField name="description" label="Description" type="textarea" rows={4} placeholder="Optional description..." />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            <Controller
              name="tagIds"
              control={control}
              render={({ field }) => (
                <>
                  {tags?.map(tag => {
                    const isSelected = field.value.includes(tag.id!);
                    return (
                      <button
                        type="button" key={tag.id} onClick={() => handleTagToggle(tag.id!)}
                        className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition-all duration-200 ${
                          isSelected ? 'text-white' : 'text-text-primary bg-surface hover:bg-surface/80'
                        }`}
                        style={{ backgroundColor: isSelected ? tag.color : undefined }}
                      >
                        {isSelected && <Check size={14} />}
                        {tag.name}
                      </button>
                    );
                  })}
                </>
              )}
            />
            {tags?.length === 0 && <p className="text-text-secondary text-sm">No tags available. Go to "Tags" to create some.</p>}
          </div>
          {errors.tagIds && <p className="mt-1 text-sm text-red-400">{errors.tagIds.message}</p>}
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" id="read"
              className="h-4 w-4 rounded border-surface bg-surface text-primary focus:ring-primary focus:outline-none"
              {...methods.register("read")}
            />
            <span className="text-sm font-medium text-text-primary">Mark as read</span>
          </label>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:ring-offset-2 focus:ring-offset-background"
            disabled={isSubmitting}
          >
            <Save size={16} />
            {initialResource ? 'Save Changes' : 'Save Bookmark'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

export default BookmarkForm;