import { createProjectVersion, updateVersion, projectForVersion, versionName, snapshotProject, newestVersionsFirst, readLocalProject, ProjectVersion } from "./versionHistory";
import { serializeProjectDetailDates, sanitizeForFirestore } from "./projectSerialization";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  deleteField,
  setDoc,
  query,
  where,
  runTransaction,
  writeBatch,
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
import {
  withPublishedBrowserInfo,
  withSavedBrowserInfo,
} from "./browserInfo";

function normalizeProjectDetailDates(projectDetail: any): ProjectDetail {
  const createdDate = new Date(projectDetail.createdDate);
  const updatedDate = projectDetail.updatedDate
    ? new Date(projectDetail.updatedDate)
    : createdDate;

  return {
    ...projectDetail,
    createdDate,
    updatedDate,
  };
}

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

  const path = `users/${uid}/projects/${sanitizePathKey(projectName)}/images/${crypto.randomUUID()}-${index}.${ext}`;
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
  project: Project,
  kind?: "manual"
): Promise<Project> {
  const uploadedLyricTexts = await uploadLyricTextImages(
    uid,
    project.projectDetail.name,
    project.lyricTexts
  );

  const data = withSavedBrowserInfo({
    ...snapshotProject(project),
    images: await uploadProjectImages(uid, project.projectDetail.name, project.images ?? []),
    lyricTexts: uploadedLyricTexts,
    generatedImageLog: stripBase64FromGeneratedImages(project.generatedImageLog),
    projectDetail: serializeProjectDetailDates(project.projectDetail),
  });
  return writeProjectVersion(uid, { ...data, versionId: project.versionId } as unknown as Project, kind);
}

export async function loadProjectsFromFirestore(
  uid: string
): Promise<Project[]> {
  const snapshot = await getDocs(projectsCollection(uid));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      projectDetail: normalizeProjectDetailDates(data.projectDetail),
      source: "cloud" as const,
    } as Project;
  });
}

export async function deleteProjectFromFirestore(
  uid: string,
  project: Project
): Promise<void> {
  const history = await getDocs(versionsCollection(uid, project.projectDetail.name));
  for (let offset = 0; offset < history.docs.length; offset += 450) {
    const batch = writeBatch(db);
    history.docs.slice(offset, offset + 450).forEach(version => batch.delete(version.ref));
    await batch.commit();
  }
  await deleteProjectImages(uid, project.projectDetail.name);
  await deleteDoc(projectDoc(uid, project.projectDetail.name));
  // Also remove the published version if it exists
  const pubId = publishedIdFor(uid, project.projectDetail.name);
  const pubSnap = await getDoc(publishedDoc(pubId));
  if (pubSnap.exists() && pubSnap.data().uid === uid) {
    await deleteDoc(publishedDoc(pubId));
  }
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
  project: Project,
  version?: ProjectVersion
): Promise<string> {
  const id = publishedIdFor(uid, project.projectDetail.name);

  const uploadedLyricTexts = await uploadLyricTextImages(
    uid,
    project.projectDetail.name,
    project.lyricTexts
  );

  const data = withPublishedBrowserInfo(
    withSavedBrowserInfo({
    ...snapshotProject(project),
    images: await uploadProjectImages(uid, project.projectDetail.name, project.images ?? []),
    lyricTexts: uploadedLyricTexts,
    id,
    uid,
    username,
    publishedAt: new Date().toISOString(),
    versionId: version?.id,
    versionName: version ? versionName(version) : undefined,
    versionRevision: version?.revision,
    generatedImageLog: stripBase64FromGeneratedImages(project.generatedImageLog ?? []),
    projectDetail: serializeProjectDetailDates(project.projectDetail),
    })
  );

  await setDoc(publishedDoc(id), sanitizeForFirestore(data));
  return id;
}

export async function unpublishProject(
  projectId: string,
  uid: string
): Promise<void> {
  const reference = publishedDoc(projectId);
  const snapshot = await getDoc(reference);
  if (snapshot.exists() && snapshot.data().uid === uid) await deleteDoc(reference);
}

export async function loadPublishedProjects(): Promise<Project[]> {
  const snapshot = await getDocs(publishedCollection());
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      projectDetail: normalizeProjectDetailDates(data.projectDetail),
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
      projectDetail: normalizeProjectDetailDates(data.projectDetail),
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
    projectDetail: normalizeProjectDetailDates(data.projectDetail),
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

function versionsCollection(uid: string, projectName: string) {
  return collection(projectDoc(uid, projectName), "versions");
}

async function writeProjectVersion(uid: string, project: Project, kind?: "manual") {
  const versionsRef = versionsCollection(uid, project.projectDetail.name);
  const existing = await getDocs(versionsRef);
  const history = newestVersionsFirst(existing.docs.map(item => item.data() as ProjectVersion));
  const savedRef = projectDoc(uid, project.projectDetail.name);
  return runTransaction(db, async transaction => {
    const saved = await transaction.get(savedRef);
    const requested = project.versionId ?? saved.data()?.versionId ?? (saved.data()?.versionSequence == null ? history[0]?.id : undefined);
    const prior = requested ? await transaction.get(doc(versionsRef, requested)) : undefined;
    if (requested && !prior?.exists() && kind !== "manual") throw new Error("This version was deleted. Choose another version or create a new one.");
    const sequence = Math.max(saved.data()?.versionSequence ?? 0, ...history.map(item => item.number ?? 0));
    const version = kind === "manual" || !prior?.exists()
      ? createProjectVersion(project, kind ?? "save", sequence + 1)
      : updateVersion(prior.data() as ProjectVersion, project);
    const next = { ...projectForVersion(project, version), source: "cloud" as const, versionSequence: Math.max(sequence, version.number ?? 0) };
    transaction.set(doc(versionsRef, version.id), sanitizeForFirestore(version));
    transaction.set(savedRef, sanitizeForFirestore(next));
    return next;
  });
}

export async function createCloudVersionFromSaved(uid: string, projectName: string) {
  const saved = await getDoc(projectDoc(uid, projectName));
  if (!saved.exists()) throw new Error("Save this project before creating a version.");
  return saveProjectToFirestore(uid, { ...saved.data(), projectDetail: normalizeProjectDetailDates(saved.data().projectDetail) } as Project, "manual");
}

export async function renameCloudVersion(uid: string, projectName: string, id: string, name: string) {
  const reference = doc(versionsCollection(uid, projectName), id);
  await runTransaction(db, async transaction => {
    const version = await transaction.get(reference);
    const saved = await transaction.get(projectDoc(uid, projectName));
    if (!version.exists()) throw new Error("Version not found.");
    const label = name.trim() || versionName(version.data() as ProjectVersion);
    transaction.update(reference, { name: label });
    if (saved.data()?.versionId === id) transaction.update(projectDoc(uid, projectName), { versionName: label });
  });
}

export async function loadCloudProjectHistory(uid: string, projectName: string) {
  const [history, saved, published] = await Promise.all([
    getDocs(versionsCollection(uid, projectName)),
    getDoc(projectDoc(uid, projectName)),
    getDoc(publishedDoc(publishedIdFor(uid, projectName))),
  ]);
  const versions = history.docs.map(item => item.data() as ProjectVersion);
  return { versions: newestVersionsFirst(versions), savedVersionId: saved.data()?.versionId as string | undefined,
    publishedId: published.exists() ? published.id : undefined,
    publishedProject: published.exists() ? published.data() as Project : undefined };
}

export async function deleteCloudVersion(uid: string, projectName: string, versionId: string) {
  const savedRef = projectDoc(uid, projectName);
  await runTransaction(db, async transaction => {
    const saved = await transaction.get(savedRef);
    transaction.delete(doc(versionsCollection(uid, projectName), versionId));
    if (saved.exists() && saved.data().versionId === versionId) {
      transaction.update(savedRef, { versionId: deleteField(), versionName: deleteField(), versionRevision: deleteField() });
    }
  });
}

export async function publishSavedVersion(uid: string, username: string, project: Project, versionId: string): Promise<string> {
  let version: ProjectVersion | undefined;
  if (project.source === "local") {
    version = readLocalProject(project)?.versionHistory?.find(item => item.id === versionId);
  } else {
    const snapshot = await getDoc(doc(versionsCollection(uid, project.projectDetail.name), versionId));
    if (snapshot.exists()) version = snapshot.data() as ProjectVersion;
  }
  if (!version) throw new Error("This version is no longer available.");
  if (version.project.projectDetail.isLocalUrl) throw new Error("Versions using a local audio file cannot be published.");
  return publishProject(uid, username, projectForVersion(project, version), version);
}
