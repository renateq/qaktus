"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";

export function WaitlistDialog() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted && !open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Join waitlist</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join the Waitlist</DialogTitle>
          <DialogDescription className="mt-1 mb-3">
            Get early access and per-link analytics — see exactly how many
            visitors reached each destination.
          </DialogDescription>
        </DialogHeader>
        <WaitlistForm onSuccess={() => setSubmitted(true)} />
      </DialogContent>
    </Dialog>
  );
}
