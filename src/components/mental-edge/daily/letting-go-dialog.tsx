"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LettingGoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LettingGoDialog({ open, onClose }: LettingGoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="sm:text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-sky-400/20">
            <span className="text-3xl" role="img" aria-label="lotus">
              🪷
            </span>
          </div>
          <DialogTitle className="text-xl">Day Complete</DialogTitle>
          <DialogDescription asChild>
            <blockquote className="mt-3 border-l-2 border-emerald-500/50 pl-4 text-left italic text-foreground/80 leading-relaxed">
              Today is complete. I accept the outcome and release the meaning
              attached to it. My job is execution, not prediction — let&apos;s
              get calm &amp; ready for tomorrow!
            </blockquote>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-2">
          <Button onClick={onClose} className="px-8">
            Close &amp; Let Go
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
