import { useState, useEffect } from "react";
import { loadManifest, isManifestLoaded } from "./sections";

/** Returns true once the content manifest has finished loading. */
export function useManifest(): boolean {
  const [ready, setReady] = useState(isManifestLoaded);
  useEffect(() => {
    if (isManifestLoaded()) { setReady(true); return; }
    loadManifest().then(() => setReady(true));
  }, []);
  return ready;
}
