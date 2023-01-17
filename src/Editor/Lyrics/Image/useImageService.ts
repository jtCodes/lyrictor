import { useState } from "react";

export function useImageService() {
  const [isLoading, setState] = useState(false);
  const load = (aPromise: Promise<any>) => {
    setState(true);
    return aPromise.finally(() => setState(false));
  };

  return [isLoading, load] as const;
}
