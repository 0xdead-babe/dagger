import { useState, useEffect } from "react";
import { useTags } from "@/hooks/useTags";
import { useBookmarks } from "@/hooks/useBookmarks";
import type { Tag } from "@/types/entities";
import { Trash2, Hash, Edit2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type SubmitHandler,
  FormProvider,
  Controller,
} from "react-hook-form";
import FormField from "@/components/FormField";
import { ERROR_MESSAGES } from "@/constants";
import Modal from "@/components/Modal";

const TAG_COLORS = [
  { name: 'clay', hex: '#C9703F' },
  { name: 'amber', hex: '#D9A441' },
  { name: 'sage', hex: '#8FA876' },
  { name: 'teal', hex: '#4FA8A0' },
  { name: 'dusty blue', hex: '#6E8FC7' },
  { name: 'lavender', hex: '#9B87C4' },
  { name: 'rose', hex: '#C97A9E' },
  { name: 'ember', hex: '#C4553A' },
  { name: 'moss', hex: '#7A8F5C' },
  { name: 'stone', hex: '#9C9184' }
];

const TagFormSchema = z.object({
  name: z.string().min(1, ERROR_MESSAGES.TAG_NAME_REQUIRED),
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

  const formMethods = useForm<TagFormInputs>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: {
      name: "",
      color: TAG_COLORS[9].hex,
    },
  });

  const { handleSubmit, reset, setValue, watch, control } = formMethods;
  const currentColor = watch("color");

  // React to external create modal request from App header button
  useEffect(() => {
    if (requestCreateModal) {
      setEditingTag(undefined);
      setIsModalOpen(true);
      onCreateModalHandled?.();
    }
  }, [requestCreateModal, onCreateModalHandled]);

  useEffect(() => {
    if (editingTag) {
      setValue("name", editingTag.name);
      setValue("color", editingTag.color || TAG_COLORS[9].hex);
      setIsModalOpen(true);
    } else {
      reset();
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].hex;
      setValue("color", randomColor);
      setShowCustomColor(false);
    }
  }, [editingTag, setValue, reset]);

  const onTagFormSubmit: SubmitHandler<TagFormInputs> = async (data) => {
    if (editingTag) {
      await updateTag(editingTag.id, {
        name: data.name.trim(),
        color: data.color,
      });
      setEditingTag(undefined);
    } else {
      await addTag(data.name.trim(), data.color);
    }
    setIsModalOpen(false);
    reset();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(ERROR_MESSAGES.DELETE_TAG_CONFIRMATION)) {
      await deleteTag(id);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
  };

  const openNewModal = () => {
    setEditingTag(undefined);
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingTag(undefined);
    setIsModalOpen(false);
  }

  const getBookmarkCount = (tagId: string) => {
    return bookmarks?.filter(b => b.tagIds.includes(tagId)).length || 0;
  };

  return (
    <div className="flex flex-col w-full pb-4">
      {tags && tags.length > 0 ? (
        <div className="bg-[#1D1912] border border-[#2A241C] rounded-[10px] overflow-hidden">
          {tags.map((tag, index) => {
            const count = getBookmarkCount(tag.id as string);
            return (
              <div
                key={tag.id}
                className={`group flex items-center gap-[11px] px-4 py-3 hover:bg-[#201B14] transition-colors ${index !== tags.length - 1 ? 'border-b border-[#241F19]' : ''}`}
              >
                <div
                  className="w-[14px] h-[14px] rounded-full shrink-0"
                  style={{ background: tag.color || TAG_COLORS[0].hex }}
                ></div>
                <div className="text-[13.5px] text-text-primary flex-1 truncate">{tag.name}</div>
                <div className="text-[11.5px] text-[#6E6455] shrink-0">{count} bookmark{count !== 1 ? 's' : ''}</div>
                <div className="flex shrink-0 items-center gap-2 ml-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(tag)}
                    className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[#9C9184] hover:bg-[#2A241C] hover:text-text-primary transition-colors"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id as string)}
                    className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[#9C9184] hover:bg-[#2A241C] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={11} />
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
            className="px-3.5 py-1.5 mt-2 flex items-center justify-center rounded-[7px] text-[11.5px] font-medium border border-[#322B22] bg-[#201B14] text-[#EFE7DA] hover:border-[#E2622E] hover:text-[#F0A57C] transition-colors"
          >
            + New tag
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
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
                placeholder="e.g., rust"
              />
              <div className="flex items-center gap-2 bg-[#181510] border border-[#2A241C] rounded-[7px] px-3 py-2.5 mb-4">
                <span className="w-[9px] h-[9px] rounded-full shrink-0" style={{ background: currentColor || TAG_COLORS[9].hex }}></span>
                <span className="text-[13.5px] text-[#EFE7DA] truncate">{watch("name") || "Preview"}</span>
                <span className="text-[10px] text-[#6E6455] ml-auto shrink-0">preview</span>
              </div>
            </div>

            <div>
              <div className="block text-[10.5px] uppercase tracking-wider text-[#6E6455] mb-1.5 font-semibold">Color</div>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {TAG_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      setValue("color", c.hex, { shouldValidate: true });
                      setShowCustomColor(false);
                    }}
                    className={`w-[22px] h-[22px] rounded-full mx-auto transition-all ${currentColor.toUpperCase() === c.hex.toUpperCase() && !showCustomColor ? 'ring-2 ring-[#E2622E] ring-offset-2 ring-offset-canvas' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
              {!showCustomColor ? (
                <button
                  type="button"
                  onClick={() => setShowCustomColor(true)}
                  className="text-[11px] text-[#C9703F] hover:text-[#E2622E] hover:underline transition-all block mt-4 mb-3.5"
                >
                  Custom color…
                </button>
              ) : (
                <div className="flex items-center gap-2 mt-2 mb-3.5">
                  <Controller
                    name="color"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="color"
                        className="h-8 w-12 cursor-pointer rounded-md border border-[#2E2820] bg-[#201B14] p-0.5 transition-colors"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-[#2E2820] bg-[#201B14] p-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
                    {...formMethods.register("color")}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="text-sm text-[#9C9184] px-2 py-2 hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="add-btn text-sm px-4 py-2 gap-1.5"
              >
                {editingTag ? "Save Changes" : "Create Tag"}
              </button>
            </div>
          </form>
        </FormProvider>
      </Modal>
    </div>
  );
}
