import { useState, useEffect, useMemo } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  Controller,
  type SubmitHandler,
  FormProvider,
} from "react-hook-form";
import { ERROR_MESSAGES } from "@/constants";
import FormField from "@/components/FormField";
import { TagSelector } from "@/components/TagSelector";
import type { Bookmark } from "@/types/entities";

const BookmarkFormSchema = z.object({
  url: z
    .string()
    .url(ERROR_MESSAGES.INVALID_URL)
    .min(1, ERROR_MESSAGES.URL_REQUIRED),
  title: z.string().min(1, ERROR_MESSAGES.TITLE_REQUIRED),
  description: z.string().optional(),
  read: z.boolean(),
  tagIds: z.array(z.string()),
});

type BookmarkFormInputs = z.infer<typeof BookmarkFormSchema>;

interface BookmarkFormProps {
  initialResource?: Bookmark;
  onSave?: () => void;
}

function BookmarkForm({ initialResource, onSave }: BookmarkFormProps) {
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
    watch,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = methods;

  const url = watch("url");
  const title = watch("title");

  const [loadingTitle, setLoadingTitle] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");

  // Duplicate detection: check if URL already exists (only for new bookmarks)
  const duplicateBookmark = useMemo(() => {
    if (isSubmitSuccessful || isSubmitting) return null;
    if (initialResource?.id) return null; // Don't check when editing
    if (!url) return null;
    try {
      const parsed = new URL(url);
      // Normalize: compare without trailing slash and lowercase
      const normalizedUrl = (parsed.origin + parsed.pathname).replace(/\/$/, "").toLowerCase() + parsed.search + parsed.hash;
      return bookmarks?.find((b) => {
        try {
          const bParsed = new URL(b.url);
          const bNormalized = (bParsed.origin + bParsed.pathname).replace(/\/$/, "").toLowerCase() + bParsed.search + bParsed.hash;
          return bNormalized === normalizedUrl;
        } catch {
          return false;
        }
      }) || null;
    } catch {
      return null;
    }
  }, [url, bookmarks, initialResource?.id, isSubmitSuccessful, isSubmitting]);

  useEffect(() => {
    if (title && errorTitle) {
      setErrorTitle("");
    }
  }, [title, errorTitle]);

  useEffect(() => {
    const fetchTitle = async (isActive: boolean) => {
      const currentUrl = watch("url");
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
                  const currentTitle = watch("title");
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
                const currentTitle = watch("title");
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
        if (isActive && !watch("title")) {
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
  }, [url, initialResource?.id, setValue, watch]);

  const onSubmit: SubmitHandler<BookmarkFormInputs> = async (data) => {
    if (initialResource?.id) {
      await updateBookmark(initialResource.id, data);
    } else {
      await addBookmark(data);
    }
    if (onSave) onSave();
  };



  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-[460px]">
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">
          <div>
            <label
              htmlFor="url"
              className="block text-[10.5px] uppercase tracking-wider text-[#6E6455] mb-1.5 font-semibold"
            >
              URL
            </label>
            <div className="relative">
              <input
                type="url"
                id="url"
                placeholder="https://example.com"
                className={`w-full rounded-md border bg-surface-raised p-2.5 text-text-primary placeholder-text-secondary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-all ${duplicateBookmark ? 'border-[#D9A441]' : 'border-border'}`}
                {...methods.register("url")}
              />
              {loadingTitle && (
                <Loader2 className="absolute right-2 top-2 h-5 w-5 animate-spin text-text-secondary" />
              )}
            </div>
            {errors.url && (
              <p className="mt-1 text-sm text-red-400">{errors.url.message}</p>
            )}
            {errorTitle && (
              <p className="mt-1 text-sm text-red-400">{errorTitle}</p>
            )}
            {duplicateBookmark && (
              <div className="mt-2 flex items-start gap-2 bg-[#2A2210] border border-[#3D3520] rounded-[7px] px-3 py-2.5">
                <AlertTriangle size={14} className="text-[#D9A441] shrink-0 mt-0.5" />
                <div className="text-[11.5px] leading-snug">
                  <span className="text-[#D9A441] font-medium">Already saved</span>
                  <span className="text-[#9C9184]"> — </span>
                  <span className="text-text-secondary truncate">
                    "{duplicateBookmark.title}"
                  </span>
                  <span className="text-[#9C9184]"> is already in your bookmarks. Saving will create a duplicate.</span>
                </div>
              </div>
            )}
          </div>
          <FormField
            name="title"
            label="Title"
            type="text"
            placeholder="Bookmark Title"
          />
          <div>
            <label className="block text-[10.5px] uppercase tracking-wider text-[#6E6455] mb-1.5 font-semibold">
              Description <span style={{textTransform: 'none', color: '#544C40'}}>(optional)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Optional description..."
              className="w-full rounded-md border border-border bg-surface-raised p-2.5 text-text-primary placeholder-text-secondary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-all"
              {...methods.register("description")}
            />
          </div>
          <div>
            <div className="block text-[10.5px] uppercase tracking-wider text-[#6E6455] mb-1.5 font-semibold">
              Tags <span style={{textTransform: 'none', color: '#544C40'}}>(optional)</span>
            </div>
            <Controller
              name="tagIds"
              control={control}
              render={({ field }) => (
                <TagSelector value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.tagIds && (
              <p className="mt-1 text-sm text-red-400">{errors.tagIds.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border shrink-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="read"
              className="custom-checkbox"
              {...methods.register("read")}
            />
            <span className="text-sm font-medium text-text-primary">
              Mark as read
            </span>
          </label>
          <button
            type="submit"
            className="add-btn text-sm px-4 py-2 gap-1.5"
            disabled={isSubmitting}
          >
            <Save size={16} />
            {initialResource?.id ? "Save Changes" : "Save Bookmark"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

export default BookmarkForm;
