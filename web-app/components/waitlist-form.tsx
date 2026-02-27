"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidEmail } from "@/lib/email";
import { Check } from "lucide-react";

type State = "idle" | "submitting" | "success" | "error";

export function WaitlistForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [clientError, setClientError] = useState("");

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setClientError("Please enter a valid email address.");
      return;
    }

    setClientError("");
    setState("submitting");

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.status === 201 || res.status === 409) {
      setState("success");
      onSuccess?.();
    } else {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Check />
        <p className="opacity-70">
          You&apos;re on the list. We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setClientError("");
          }}
        />
        <Button type="submit" disabled={state === "submitting"}>
          Submit
        </Button>
      </div>
      {clientError && (
        <p className="mt-2 text-sm text-red-500">{clientError}</p>
      )}
      {state === "error" && (
        <p className="mt-2 text-sm text-red-500">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
