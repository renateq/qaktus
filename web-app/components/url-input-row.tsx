"use client";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Link, X } from "lucide-react";
import { useState } from "react";

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

interface UrlInputRowProps {
  value: string;
  onChange(value: string): void;
  onRemove?(): void;
}

export function UrlInputRow({ value, onChange, onRemove }: UrlInputRowProps) {
  const [touched, setTouched] = useState(false);

  const isValid = isValidUrl(value);
  const showError = touched && !isValid;

  return (
    <div className="flex flex-col gap-1">
      <InputGroup>
        <InputGroupAddon>
          <Link />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Enter URL"
          value={value}
          aria-invalid={showError || undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {onRemove && (
          <InputGroupAddon align="inline-end">
            <Button
              variant="ghost"
              className="h-7 w-7"
              onClick={onRemove}
            >
              <X />
            </Button>
          </InputGroupAddon>
        )}
      </InputGroup>
      {showError && (
        <p className="text-destructive px-1 text-xs">
          Please enter a valid URL
        </p>
      )}
    </div>
  );
}
