"use client";

import { useState } from "react";
import { GeneratedUrlDisplay } from "../components/generated-url-display";
import { UrlForm } from "../components/url-form";

type Status = "idle" | "generating" | "generated";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [urls, setUrls] = useState<string[]>([""]);
  const [shortUrl, setShortUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isUsingCustomWeights, setIsUsingCustomWeights] = useState(false);

  async function generateShortLink(weights?: number[]) {
    setStatus("generating");

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/generate-link`,
      {
        method: "POST",
        body: JSON.stringify({
          urls: urls.map((url, i) => ({
            original_url: url,
            weight: weights?.[i] ?? 1,
          })),
        }),
      },
    );

    const { short_code, expires_at } = await res.json();

    setUrls([""]);
    setShortUrl(`${process.env.NEXT_PUBLIC_API_URL}/${short_code}`);
    setExpiresAt(expires_at ?? null);
    setStatus("generated");
  }

  function copyGeneratedUrl() {
    navigator.clipboard.writeText(shortUrl);
    setIsCopied(true);
  }

  function reset() {
    setUrls([""]);
    setIsCopied(false);
    setExpiresAt(null);
    setStatus("idle");
  }

  return (
    <main className="min-h-[calc(100dvh-5rem)] px-10 pt-20">
      <p className="text-center text-3xl font-bold">
        One link, multiple destinations.
      </p>
      <p className="mx-auto mt-5 max-w-xl text-center opacity-70">
        Create a single short link that intelligently distributes traffic across
        multiple destinations. Perfect for A/B testing, gradual rollouts, or
        simply splitting an audience — no code required.
      </p>
      <div className="mx-auto mt-20 max-w-sm">
        {status !== "generated" ? (
          <UrlForm
            urls={urls}
            onUrlChange={(i, value) =>
              setUrls((current) => {
                const next = [...current];
                next[i] = value;
                return next;
              })
            }
            onAddUrl={() => setUrls((current) => [...current, ""])}
            onRemoveUrl={(i) =>
              setUrls((current) => current.filter((_, idx) => idx !== i))
            }
            onGenerate={generateShortLink}
            isGenerating={status === "generating"}
            isUsingCustomWeights={isUsingCustomWeights}
            setIsUsingCustomWeights={setIsUsingCustomWeights}
          />
        ) : (
          <GeneratedUrlDisplay
            shortUrl={shortUrl}
            expiresAt={expiresAt}
            isCopied={isCopied}
            onCopy={copyGeneratedUrl}
            onReset={reset}
          />
        )}
      </div>
    </main>
  );
}
