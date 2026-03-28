import { useState, useEffect } from "react";
import { ToastQueue } from "@react-spectrum/toast";
import { useAuthStore } from "../Auth/store";
import {
  publishProject,
  unpublishProject,
  getPublishedIdForProject,
} from "./firestoreProjectService";
import { Project } from "./types";
import { projectUsesLocalAudioFile } from "./sourcePlugins/localFilePlugin";

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

  const publish = async (project: Project, beforePublish?: () => Promise<void>) => {
    if (!user || !username || isPublishing) return;

    if (projectUsesLocalAudioFile(project.projectDetail)) {
      ToastQueue.negative("Projects using a local audio file cannot be published", {
        timeout: 5000,
      });
      return;
    }

    setIsPublishing(true);
    try {
      if (beforePublish) await beforePublish();
      const isUpdate = !!publishedId;
      const id = await publishProject(user.uid, username, project);
      setPublishedId(id);
      ToastQueue.positive(
        isUpdate ? "Published project updated" : "Project published to Discover",
        { timeout: 5000 }
      );
      onComplete?.();
    } catch (error) {
      console.error("Failed to publish:", error);
      ToastQueue.negative("Failed to publish project", { timeout: 5000 });
    } finally {
      setIsPublishing(false);
    }
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

  return { publishedId, isPublishing, publish, unpublish, canPublish: !!user && !!username };
}
