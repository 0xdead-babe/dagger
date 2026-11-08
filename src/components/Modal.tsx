import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[#080604]/75 backdrop-blur-[5px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto custom-scrollbar">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-5 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel data-modal-panel className="relative w-full max-w-[500px] overflow-visible rounded-2xl border border-[#514032] bg-surface p-5 sm:p-6 text-left align-middle shadow-[0_32px_90px_rgba(0,0,0,0.65)] transition-all">
                <Dialog.Title
                  as="h3"
                  className="flex items-center justify-between gap-3 border-b border-border/70 pb-4 text-[16px] font-semibold tracking-tight leading-6 text-text-primary"
                >
                  {title}
                  <button
                    type="button"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors"
                    onClick={onClose}
                    aria-label="Close dialog"
                  >
                    <X size={17} />
                  </button>
                </Dialog.Title>
                <div className="mt-5">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default Modal;
