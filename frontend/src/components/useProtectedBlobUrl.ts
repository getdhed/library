import { useEffect, useState } from "react";
import { fetchProtectedBlob } from "../api/protectedFiles";

type ProtectedBlobState = {
  url: string;
  isLoading: boolean;
  error: string;
};

type ProtectedBlobRequestState = ProtectedBlobState & {
  sourceUrl: string;
  token: string | null;
};

function isLocalBlobUrl(url: string) {
  return url.startsWith("blob:") || url.startsWith("data:");
}

export function useProtectedBlobUrl(
  sourceUrl: string,
  token?: string | null
): ProtectedBlobState {
  const localUrl = isLocalBlobUrl(sourceUrl) ? sourceUrl : "";
  const currentToken = token ?? null;
  const [state, setState] = useState<ProtectedBlobRequestState>({
    sourceUrl,
    token: currentToken,
    url: localUrl,
    isLoading: Boolean(sourceUrl && !localUrl && currentToken),
    error: "",
  });

  useEffect(() => {
    if (!sourceUrl || localUrl) {
      setState({ sourceUrl, token: currentToken, url: localUrl, isLoading: false, error: "" });
      return;
    }
    if (!token) {
      setState({ sourceUrl, token: currentToken, url: "", isLoading: false, error: "missing_token" });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let createdUrl = "";
    setState({ sourceUrl, token: currentToken, url: "", isLoading: true, error: "" });

    void fetchProtectedBlob(sourceUrl, token, controller.signal)
      .then((blob) => {
        createdUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          createdUrl = "";
          return;
        }
        setState({ sourceUrl, token: currentToken, url: createdUrl, isLoading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        setState({
          sourceUrl,
          token: currentToken,
          url: "",
          isLoading: false,
          error: error instanceof Error ? error.message : "request_failed",
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [localUrl, sourceUrl, token]);

  return localUrl
    ? { url: localUrl, isLoading: false, error: "" }
    : state.sourceUrl === sourceUrl && state.token === currentToken
      ? { url: state.url, isLoading: state.isLoading, error: state.error }
      : {
          url: "",
          isLoading: Boolean(sourceUrl && currentToken),
          error: sourceUrl && !currentToken ? "missing_token" : "",
        };
}
