import { useState, useEffect } from "react";
import { ToastQueue } from "@react-spectrum/toast";
import { useAuthStore } from "../Auth/store";
import {
  unpublishProject,
  getPublishedIdForProject,
} from "./firestoreProjectService";

export function usePublishProject(
  projectName: string | undefined,
  onComplete?: () => void
) {
  const user = useAuthStore((state) => state.user);
  const username = useAuthStore((state) => state.username);

  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (user && projectName) {
      getPublishedIdForProject(user.uid, projectName)
        .then(setPublishedId)
        .catch(() => setPublishedId(null));
    } else {
      setPublishedId(null);
    }
  }, [user?.uid, projectName]);

  const refreshPublished = async () => {
    if (user && projectName) setPublishedId(await getPublishedIdForProject(user.uid, projectName));
    onComplete?.();
  };

  const unpublish = async () => {
    if (!user || !publishedId || isPublishing) return;
    setIsPublishing(true);
    try {
      await unpublishProject(publishedId, user.uid);
      setPublishedId(null);
      ToastQueue.positive("Project unpublished", { timeout: 5000 });
      onComplete?.();
    } catch (error) {
      console.error("Failed to unpublish:", error);
      ToastQueue.negative("Failed to unpublish project", { timeout: 5000 });
    } finally {
      setIsPublishing(false);
    }
  };

  return { publishedId, isPublishing, refreshPublished, unpublish, canPublish: !!user && !!username };
}
