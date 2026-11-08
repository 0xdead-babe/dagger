import { useState, useEffect, useMemo } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Loader2, Save, AlertTriangle, Link2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  useWatch,
  Controller,
  type SubmitHandler,
  FormProvider,
} from "react-hook-form";
import { ERROR_MESSAGES } from "@/constants";
import FormField from "@/components/FormField";
import { TagSelector } from "@/components/TagSelector";
import type { Bookmark } from "@/types/entities";
import { bookmarkUrlKey, isSafeBookmarkUrl } from "@/utils/url";

const BookmarkFormSchema = z.object({
  url: z
    .string()
    .min(1, ERROR_MESSAGES.URL_REQUIRED)
    .refine(isSafeBookmarkUrl, ERROR_MESSAGES.INVALID_URL),
  title: z.string().min(1, ERROR_MESSAGES.TITLE_REQUIRED),
  description: z.string().optional(),
  read: z.boolean(),
  tagIds: z.array(z.string()),
});

type BookmarkFormInputs = z.infer<typeof BookmarkFormSchema>;

interface BookmarkFormProps {
  initialResource?: Partial<Bookmark>;
  onSave?: () => void;
  onCancel?: () => void;
}

function BookmarkForm({ initialResource, onSave, onCancel }: BookmarkFormProps) {
  const { addBookmark, updateBookmark, bookmarks } = useBookmarks();

  const methods = useForm<BookmarkFormInputs>({
    resolver: zodResolver(BookmarkFormSchema),
    defaultValues: {
      url: initialResource?.url || "",
      title: initialResource?.title || "",
      description: initialResource?.description || "",
      read: initialResource?.read || false,
      tagIds: initialResource?.tagIds ?? [],
    },
  });

  const {
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = methods;

  const url = useWatch({ control, name: "url" });
  const title = useWatch({ control, name: "title" });

  const [loadingTitle, setLoadingTitle] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [saveError, setSaveError] = useState("");

  const duplicateBookmark = useMemo(() => {
    if (isSubmitting) return null;
    if (initialResource?.id || !isSafeBookmarkUrl(url)) return null;
    const key = bookmarkUrlKey(url);
    return bookmarks.find((bookmark) => bookmarkUrlKey(bookmark.url) === key) ?? null;
  }, [url, bookmarks, initialResource?.id, isSubmitting]);

  useEffect(() => {
    const fetchTitle = async (isActive: boolean) => {
      const currentUrl = getValues("url");
      const isValidUrl = BookmarkFormSchema.shape.url.safeParse(currentUrl).success;

      if (isValidUrl) {
        setLoadingTitle(true);
        setErrorTitle("");
        try {
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage(
              { type: "FETCH_TITLE", payload: { url: currentUrl } },
              (response: { title: string | null; error?: string }) => {
                if (!isActive) return;
                setLoadingTitle(false);
                if (chrome.runtime.lastError) {
                  setErrorTitle(ERROR_MESSAGES.NETWORK_ERROR);
                  return;
                }
                if (response && response.title) {
                  // Only set title if user hasn't typed a custom one
                  const currentTitle = getValues("title");
                  if (!currentTitle) {
                    setValue("title", response.title, { shouldValidate: true });
                  }
                } else {
                  setErrorTitle(ERROR_MESSAGES.TITLE_NOT_DETECTED);
                }
              }
            );
          } else {
            // Fallback for non-extension context or if not available (e.g., local dev)
            try {
              const res = await fetch(currentUrl);
              const html = await res.text();
              const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
              if (!isActive) return;
              if (match && match[1]) {
                const currentTitle = getValues("title");
                if (!currentTitle) {
                  setValue("title", match[1].trim(), { shouldValidate: true });
                }
              } else {
                setErrorTitle(ERROR_MESSAGES.TITLE_NOT_DETECTED);
              }
            } catch (err) {
              if (!isActive) return;
              console.error("Fallback fetch error (CORS expected):", err);
              setErrorTitle(ERROR_MESSAGES.NETWORK_ERROR);
            } finally {
              if (isActive) setLoadingTitle(false);
            }
          }
        } catch (error) {
          if (!isActive) return;
          console.error("Error sending message for title:", error);
          setErrorTitle(ERROR_MESSAGES.NETWORK_ERROR);
          setLoadingTitle(false);
        }
      } else {
        if (isActive && !getValues("title")) {
          setValue("title", "", { shouldValidate: true });
          setErrorTitle("");
        }
      }
    };

    let isActive = true;
    let handler: NodeJS.Timeout | undefined;

    if (!initialResource?.id && url) {
      // Small debounce
      handler = setTimeout(() => fetchTitle(isActive), 800);
    }

    return () => {
      isActive = false;
      if (handler) clearTimeout(handler);
    };
  }, [url, initialResource?.id, setValue, getValues]);

  const onSubmit: SubmitHandler<BookmarkFormInputs> = async (data) => {
    setSaveError("");
    try {
      if (initialResource?.id) {
        await updateBookmark(initialResource.id, data);
      } else {
        await addBookmark(data);
      }
      onSave?.();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the bookmark.");
    }
  };



  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-[min(520px,calc(100dvh-180px))] min-h-[320px] flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-surface-raised/45 p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-text"><Link2 size={16} /></span>
            <p className="pt-0.5 text-[12px] leading-relaxed text-text-secondary">Save the page with a clear title and a few tags so it is easy to find later.</p>
          </div>
          <FormField name="url" label="URL">
            <div className="relative">
              <input
                type="url"
                id="url"
                placeholder="https://example.com"
                className={`field-input pr-10 ${duplicateBookmark ? '!border-[#D9A441]' : ''}`}
                aria-invalid={Boolean(errors.url)}
                aria-describedby={errors.url ? "url-error" : errorTitle && !title ? "url-title-hint" : undefined}
                {...methods.register("url")}
              />
              {loadingTitle && (
                <Loader2 className="absolute right-3 top-3 h-[18px] w-[18px] animate-spin text-text-secondary" aria-label="Fetching page title" />
              )}
            </div>
            {errorTitle && !title && (
              <p id="url-title-hint" className="field-hint text-amber-300" role="status">{errorTitle}</p>
            )}
            {duplicateBookmark && (
              <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-[#6C4C25] bg-[#3A2B19] px-3 py-2.5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300" />
                <div className="text-[12px] leading-relaxed text-text-secondary">
                  <span className="font-semibold text-amber-200">Already saved:</span> “{duplicateBookmark.title}”. Saving again will create a duplicate.
                </div>
              </div>
            )}
          </FormField>
          <FormField
            name="title"
            label="Title"
            type="text"
            placeholder="A name you will remember"
          />
          <div>
            <label htmlFor="description" className="field-label">
              Description <span className="ml-1 font-normal text-text-muted">Optional</span>
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Why is this page useful?"
              className="field-input min-h-[90px] resize-y"
              {...methods.register("description")}
            />
          </div>
          <div>
            <label htmlFor="tag-search" className="field-label">Tags <span className="ml-1 font-normal text-text-muted">Optional</span></label>
            <Controller
              name="tagIds"
              control={control}
              render={({ field }) => (
                <TagSelector value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.tagIds && (
              <p role="alert" className="field-error">{errors.tagIds.message}</p>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-surface-raised/55 px-3 py-2.5">
            <input type="checkbox" id="read" className="custom-checkbox" {...methods.register("read")} />
            <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-medium text-text-primary">Mark as read</span><span className="block text-[11px] text-text-muted">Leave this off to keep it in your reading queue.</span></span>
          </label>
        </div>

        {saveError && <p role="alert" className="field-error mt-3">{saveError}</p>}
        <div className="mt-4 flex shrink-0 items-center justify-end gap-2.5 border-t border-border/70 pt-4">
          {onCancel && <button type="button" onClick={onCancel} className="soft-btn">Cancel</button>}
          <button
            type="submit"
            className="add-btn min-w-[142px] px-4 py-2.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isSubmitting ? "Saving…" : initialResource?.id ? "Save changes" : "Save bookmark"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

export default BookmarkForm;
