"use client";

import { Button } from "@/components/ui/button";
import { Item } from "@/components/ui/item";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Clipboard, ClipboardCheck } from "lucide-react";

interface GeneratedUrlDisplayProps {
  shortUrl: string;
  expiresAt: number | null;
  isCopied: boolean;
  onCopy(): void;
  onReset(): void;
}

export function GeneratedUrlDisplay({
  shortUrl,
  expiresAt,
  isCopied,
  onCopy,
  onReset,
}: GeneratedUrlDisplayProps) {
  const formattedDate = expiresAt
    ? new Date(expiresAt * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <>
      <Item
        variant="muted"
        className="mt-10 flex-nowrap items-center justify-between"
      >
        <ScrollArea className="max-w-[calc(100%-7rem)] flex-1">
          <p className="text-base whitespace-nowrap lg:text-lg">{shortUrl}</p>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Button variant="ghost" className="h-10 w-24 shrink-0" onClick={onCopy}>
          {isCopied ? <ClipboardCheck /> : <Clipboard />}
          {isCopied ? "Copied" : "Copy"}
        </Button>
      </Item>
      {formattedDate && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          This link expires on {formattedDate}
        </p>
      )}
      <div className="mt-10 flex justify-center">
        <Button variant="ghost" onClick={onReset}>
          Generate a new link
        </Button>
      </div>
    </>
  );
}
