import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { db, storage } from "../api/firebase";
import { Project, ProjectDetail } from "./types";
import { GeneratedImage } from "../Editor/Image/AI/types";
import { ImageItem } from "../Editor/Image/Imported/ImportImageButton";
import { LyricText } from "../Editor/types";

function projectsCollection(uid: string) {
  return collection(db, "users", uid, "projects");
}

/** Sanitize a project name for use as a Firestore doc ID / Storage path segment. */
function sanitizePathKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\/\\]/g, "_")   // slashes → underscores
    .replace(/[.#$\[\]]/g, "_") // Firestore-problematic chars
    .replace(/_{2,}/g, "_")     // collapse consecutive underscores
    .replace(/^_|_$/g, "")      // trim leading/trailing underscores
    || "untitled";
}

function projectDoc(uid: string, projectName: string) {
  return doc(db, "users", uid, "projects", sanitizePathKey(projectName));
}

function isBase64DataUrl(url: string): boolean {
  return url.startsWith("data:");
}

// Recursively strip undefined values (Firestore rejects them)
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.filter((item) => item !== undefined).map(sanitizeForFirestore);
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
}

export async function uploadBase64Image(
  uid: string,
  projectName: string,
  imageUrl: string,
  index: number
): Promise<string> {
  const [header, base64Data] = imageUrl.split(",");
  if (!base64Data) {
    throw new Error(`Malformed data URL for image ${index}: missing base64 payload`);
  }
  const mimeMatch = header.match(/data:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const ext = mimeType.split("/")[1] || "png";

  let byteCharacters: string;
  try {
    byteCharacters = atob(base64Data);
  } catch {
    throw new Error(`Failed to decode base64 for image ${index}`);
  }
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });

  const path = `users/${uid}/projects/${sanitizePathKey(projectName)}/images/${index}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: mimeType });
  return getDownloadURL(storageRef);
}

async function uploadProjectImages(
  uid: string,
  projectName: string,
  images: ImageItem[]
): Promise<ImageItem[]> {
  return Promise.all(
    images.map(async (image, i) => {
      if (image.url && isBase64DataUrl(image.url)) {
        const downloadUrl = await uploadBase64Image(uid, projectName, image.url, i);
        return { ...image, url: downloadUrl };
      }
      return image;
    })
  );
}

function stripBase64FromGeneratedImages(
  images: GeneratedImage[]
): GeneratedImage[] {
  return images.filter((image) => !isBase64DataUrl(image.url));
}

export async function deleteProjectImages(uid: string, projectName: string) {
  const folderRef = ref(storage, `users/${uid}/projects/${sanitizePathKey(projectName)}/images`);
  try {
    const list = await listAll(folderRef);
    await Promise.all(list.items.map((item) => deleteObject(item)));
  } catch {
    // Folder may not exist, that's fine
  }
}

async function uploadLyricTextImages(
  uid: string,
  projectName: string,
  lyricTexts: LyricText[]
): Promise<LyricText[]> {
  return Promise.all(
    lyricTexts.map(async (lt) => {
      if (lt.isImage && lt.imageUrl && isBase64DataUrl(lt.imageUrl)) {
        const downloadUrl = await uploadBase64Image(uid, projectName, lt.imageUrl, lt.id);
        return { ...lt, imageUrl: downloadUrl };
      }
      return lt;
    })
  );
}

export async function saveProjectToFirestore(
  uid: string,
  project: Project
): Promise<LyricText[]> {
  const uploadedLyricTexts = await uploadLyricTextImages(
    uid,
    project.projectDetail.name,
    project.lyricTexts
  );

  const data = {
    ...project,
    lyricTexts: uploadedLyricTexts,
    generatedImageLog: stripBase64FromGeneratedImages(project.generatedImageLog),
    projectDetail: {
      ...project.projectDetail,
      createdDate:
        project.projectDetail.createdDate instanceof Date
          ? project.projectDetail.createdDate.toISOString()
          : project.projectDetail.createdDate,
    },
  };
  await setDoc(projectDoc(uid, project.projectDetail.name), sanitizeForFirestore(data));
  return uploadedLyricTexts;
}

export async function loadProjectsFromFirestore(
  uid: string
): Promise<Project[]> {
  const snapshot = await getDocs(projectsCollection(uid));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      projectDetail: {
        ...data.projectDetail,
        createdDate: new Date(data.projectDetail.createdDate),
      },
    } as Project;
  });
}

export async function deleteProjectFromFirestore(
  uid: string,
  project: Project
): Promise<void> {
  await deleteProjectImages(uid, project.projectDetail.name);
  await deleteDoc(projectDoc(uid, project.projectDetail.name));
}

export async function isProjectExistInFirestore(
  uid: string,
  projectDetail: ProjectDetail
): Promise<boolean> {
  const snap = await getDoc(projectDoc(uid, projectDetail.name));
  return snap.exists();
}

// ── Published projects ─────────────────────────────────────

function publishedCollection() {
  return collection(db, "published");
}

function publishedDoc(projectId: string) {
  return doc(db, "published", projectId);
}

function publishedIdFor(uid: string, projectName: string): string {
  // Deterministic ID so re-publishing the same project is an upsert, not a duplicate.
  return `${uid}_${projectName}`;
}

export async function publishProject(
  uid: string,
  username: string,
  project: Project
): Promise<string> {
  const id = publishedIdFor(uid, project.projectDetail.name);

  const uploadedLyricTexts = await uploadLyricTextImages(
    uid,
    project.projectDetail.name,
    project.lyricTexts
  );

  const data = {
    ...project,
    lyricTexts: uploadedLyricTexts,
    id,
    uid,
    username,
    publishedAt: new Date().toISOString(),
    generatedImageLog: stripBase64FromGeneratedImages(project.generatedImageLog ?? []),
    projectDetail: {
      ...project.projectDetail,
      createdDate:
        project.projectDetail.createdDate instanceof Date
          ? project.projectDetail.createdDate.toISOString()
          : project.projectDetail.createdDate,
    },
  };

  await setDoc(publishedDoc(id), sanitizeForFirestore(data));
  return id;
}

export async function unpublishProject(
  projectId: string,
  uid: string
): Promise<void> {
  const snap = await getDoc(publishedDoc(projectId));
  if (!snap.exists() || snap.data().uid !== uid) return;
  await deleteDoc(publishedDoc(projectId));
}

export async function loadPublishedProjects(): Promise<Project[]> {
  const snapshot = await getDocs(publishedCollection());
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      projectDetail: {
        ...data.projectDetail,
        createdDate: new Date(data.projectDetail.createdDate),
      },
      source: "demo" as const,
    } as Project;
  });
}

export async function loadPublishedProjectsByUid(
  uid: string
): Promise<Project[]> {
  const q = query(publishedCollection(), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      projectDetail: {
        ...data.projectDetail,
        createdDate: new Date(data.projectDetail.createdDate),
      },
      source: "demo" as const,
    } as Project;
  });
}

export async function loadPublishedProject(
  projectId: string
): Promise<Project | null> {
  const snap = await getDoc(publishedDoc(projectId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    projectDetail: {
      ...data.projectDetail,
      createdDate: new Date(data.projectDetail.createdDate),
    },
  } as Project;
}

export async function getPublishedIdForProject(
  uid: string,
  projectName: string
): Promise<string | null> {
  const id = publishedIdFor(uid, projectName);
  const snap = await getDoc(publishedDoc(id));
  return snap.exists() ? id : null;
}
