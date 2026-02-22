"use client";

import { useState } from "react";
import { GeneratedUrlDisplay } from "../components/generated-url-display";
import { UrlForm } from "../components/url-form";

type Status = "idle" | "generating" | "generated";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [urls, setUrls] = useState<string[]>([""]);
  const [shortUrl, setShortUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  async function generateShortLink() {
    setStatus("generating");

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/generate-link`,
      {
        method: "POST",
        body: JSON.stringify({
          urls: urls.map((url) => ({ original_url: url, weight: 1 })),
        }),
      },
    );

    const { short_code } = await res.json();

    setUrls([""]);
    setShortUrl(`${process.env.NEXT_PUBLIC_API_URL}/${short_code}`);
    setStatus("generated");
  }

  function copyGeneratedUrl() {
    navigator.clipboard.writeText(shortUrl);
    setIsCopied(true);
  }

  function reset() {
    setUrls([""]);
    setIsCopied(false);
    setStatus("idle");
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] pt-20">
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
          />
        ) : (
          <GeneratedUrlDisplay
            shortUrl={shortUrl}
            isCopied={isCopied}
            onCopy={copyGeneratedUrl}
            onReset={reset}
          />
        )}
      </div>
    </main>
  );
}
