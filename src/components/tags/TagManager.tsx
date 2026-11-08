import { useState, useMemo } from "react";
import { useTags } from "@/hooks/useTags";
import { useBookmarks } from "@/hooks/useBookmarks";
import type { Tag } from "@/types/entities";
import { Trash2, Hash, Edit2, Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  useWatch,
  type SubmitHandler,
  FormProvider,
  Controller,
} from "react-hook-form";
import FormField from "@/components/FormField";
import { ERROR_MESSAGES } from "@/constants";
import Modal from "@/components/Modal";

import { TAG_COLORS } from "@/constants/colors";

const TagFormSchema = z.object({
  name: z.string().trim().min(1, ERROR_MESSAGES.TAG_NAME_REQUIRED),
  color: z
    .string()
    .regex(
      /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      ERROR_MESSAGES.INVALID_COLOR_FORMAT,
    ),
});
type TagFormInputs = z.infer<typeof TagFormSchema>;

interface TagManagerProps {
  requestCreateModal?: boolean;
  onCreateModalHandled?: () => void;
}

export function TagManager({ requestCreateModal, onCreateModalHandled }: TagManagerProps) {
  const { tags, addTag, updateTag, deleteTag } = useTags();
  const { bookmarks } = useBookmarks();

  const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");

  const formMethods = useForm<TagFormInputs>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: {
      name: "",
      color: TAG_COLORS[9].hex,
    },
  });

  const { handleSubmit, reset, setValue, control, formState: { isSubmitting } } = formMethods;
  const currentColor = useWatch({ control, name: "color" });
  const currentName = useWatch({ control, name: "name" });

  const onTagFormSubmit: SubmitHandler<TagFormInputs> = async (data) => {
    setFormError("");
    try {
      if (editingTag) {
        await updateTag(editingTag.id, {
          name: data.name.trim(),
          color: data.color,
        });
      } else {
        await addTag(data.name.trim(), data.color);
      }
      closeEditModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the tag.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(ERROR_MESSAGES.DELETE_TAG_CONFIRMATION)) {
      try {
        setActionError("");
        await deleteTag(id);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not move the tag to Trash.");
      }
    }
  };

  const handleEdit = (tag: Tag) => {
    setActionError("");
    setFormError("");
    setEditingTag(tag);
    reset({ name: tag.name, color: tag.color || TAG_COLORS[9].hex });
    setShowCustomColor(Boolean(tag.color && !TAG_COLORS.some((color) => color.hex.toLowerCase() === tag.color?.toLowerCase())));
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setActionError("");
    setFormError("");
    setEditingTag(undefined);
    reset({ name: "", color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].hex });
    setShowCustomColor(false);
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingTag(undefined);
    setIsModalOpen(false);
    onCreateModalHandled?.();
    reset({ name: "", color: TAG_COLORS[9].hex });
    setShowCustomColor(false);
    setFormError("");
  }

  const bookmarkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bookmark of bookmarks) {
      for (const id of new Set(bookmark.tagIds)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [bookmarks]);

  return (
    <div className="flex flex-col w-full pb-4">
      {actionError && <div role="alert" className="mb-2 rounded border border-red-400/40 p-2 text-[11.5px] text-red-400">{actionError}</div>}
      {tags && tags.length > 0 ? (
        <div className="card">
          {tags.map((tag, index) => {
            const count = bookmarkCounts.get(tag.id) ?? 0;
            return (
              <div
                key={tag.id}
                className={`list-row ${index !== tags.length - 1 ? 'list-row-separator' : ''}`}
              >
                <div
                  className="w-[14px] h-[14px] rounded-full shrink-0"
                  style={{ background: tag.color || TAG_COLORS[0].hex }}
                ></div>
                <div className="text-[13.5px] text-text-primary flex-1 truncate">{tag.name}</div>
                <div className="text-[11.5px] text-[#6E6455] shrink-0">{count} bookmark{count !== 1 ? 's' : ''}</div>
                <div className="row-actions">
                  <button
                    onClick={() => handleEdit(tag)}
                    className="action-icon-btn"
                    aria-label={`Edit ${tag.name} tag`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id as string)}
                    className="action-icon-btn hover:!text-red-400"
                    aria-label={`Move ${tag.name} tag to Trash`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-16 px-5 gap-1.5">
          <div className="w-10 h-10 rounded-[10px] bg-[#201B14] border border-[#2E2820] flex items-center justify-center text-text-secondary mb-1.5">
            <Hash size={18} />
          </div>
          <div className="text-[14px] font-medium text-text-primary">No tags yet</div>
          <div className="text-[12px] text-text-secondary leading-snug max-w-[280px] mb-2.5">
            Tags help you group and search bookmarks. Create your first one to get started.
          </div>
          <button
            onClick={openNewModal}
            className="soft-btn mt-2"
          >
            + New tag
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen || Boolean(requestCreateModal)}
        onClose={closeEditModal}
        title={editingTag ? "Edit tag" : "New tag"}
      >
        <FormProvider {...formMethods}>
          <form onSubmit={handleSubmit(onTagFormSubmit)} className="space-y-5">
            <div className="space-y-4">
              <FormField
                name="name"
                label="Name"
                type="text"
                placeholder="e.g. Research"
                hint="A short name makes tags easier to scan."
              />
              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-raised/65 px-3 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: currentColor || TAG_COLORS[9].hex }}><Hash size={16} className="text-white/90" /></span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">{currentName || "Tag preview"}</span>
                <span className="shrink-0 text-[11px] text-text-muted">Preview</span>
              </div>
            </div>

            <fieldset>
              <legend className="field-label">Color</legend>
              <div className="grid grid-cols-5 gap-2.5 rounded-xl border border-border/70 bg-surface-raised/40 p-3">
                {TAG_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      setValue("color", c.hex, { shouldValidate: true });
                      setShowCustomColor(false);
                    }}
                    className={`mx-auto size-8 rounded-full border-2 border-black/10 transition-transform hover:scale-110 ${currentColor.toUpperCase() === c.hex.toUpperCase() && !showCustomColor ? 'ring-2 ring-accent-text ring-offset-[3px] ring-offset-surface' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    aria-label={`${c.name} color`}
                    aria-pressed={currentColor.toUpperCase() === c.hex.toUpperCase() && !showCustomColor}
                  />
                ))}
              </div>
              {!showCustomColor ? (
                <button
                  type="button"
                  onClick={() => setShowCustomColor(true)}
                  className="mt-3 text-[12px] font-medium text-accent-text hover:text-text-primary transition-colors"
                >
                  Choose a custom color…
                </button>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <Controller
                    name="color"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="color"
                        aria-label="Custom color picker"
                        className="h-[42px] w-12 cursor-pointer rounded-lg border border-border bg-surface-raised p-1"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <input
                    type="text"
                    aria-label="Custom color hex value"
                    className="field-input min-w-0 flex-1"
                    {...formMethods.register("color")}
                  />
                </div>
              )}
            </fieldset>

            {formError && <p role="alert" className="field-error">{formError}</p>}
            <div className="flex items-center justify-end gap-2.5 border-t border-border/70 pt-4">
              <button
                type="button"
                onClick={closeEditModal}
                className="soft-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="add-btn min-w-[120px] px-4 py-2.5"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isSubmitting ? "Saving…" : editingTag ? "Save changes" : "Create tag"}
              </button>
            </div>
          </form>
        </FormProvider>
      </Modal>
    </div>
  );
}
