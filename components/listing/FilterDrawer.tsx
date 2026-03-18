"use client";

import { Drawer } from "vaul";
import { X } from "lucide-react";

type FilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function FilterDrawer({ open, onOpenChange, title, children, footer }: FilterDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[101] flex max-h-[85vh] flex-col rounded-t-2xl bg-white outline-none"
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">Filter listings</Drawer.Description>
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-mowing-green/20" aria-hidden />
          <div className="flex items-center justify-between border-b border-mowing-green/10 px-4 py-3 shrink-0">
            <h2 className="text-lg font-semibold text-mowing-green">{title}</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 text-mowing-green/70 hover:bg-mowing-green/10 hover:text-mowing-green"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
          {footer ? (
            <div className="shrink-0 border-t border-mowing-green/10 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
