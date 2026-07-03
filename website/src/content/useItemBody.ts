import { useState, useEffect } from "react";
import { type SectionItem, fetchItemBody } from "./sections";

/** Hook that lazily fetches the markdown body for a SectionItem. */
export function useItemBody(item: SectionItem | undefined): string {
  const [body, setBody] = useState("");
  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    fetchItemBody(item).then((b) => {
      if (!cancelled) setBody(b);
    });
    return () => { cancelled = true; };
  }, [item?.file]);
  return body;
}
