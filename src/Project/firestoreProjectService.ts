import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../api/firebase";
import { Project, ProjectDetail } from "./types";

function projectsCollection(uid: string) {
  return collection(db, "users", uid, "projects");
}

function projectDoc(uid: string, projectName: string) {
  return doc(db, "users", uid, "projects", projectName);
}

export async function saveProjectToFirestore(
  uid: string,
  project: Project
): Promise<void> {
  const data = {
    ...project,
    projectDetail: {
      ...project.projectDetail,
      createdDate:
        project.projectDetail.createdDate instanceof Date
          ? project.projectDetail.createdDate.toISOString()
          : project.projectDetail.createdDate,
    },
  };
  await setDoc(projectDoc(uid, project.projectDetail.name), data);
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
  await deleteDoc(projectDoc(uid, project.projectDetail.name));
}

export async function isProjectExistInFirestore(
  uid: string,
  projectDetail: ProjectDetail
): Promise<boolean> {
  const snapshot = await getDocs(projectsCollection(uid));
  return snapshot.docs.some(
    (d) => d.data().projectDetail?.name === projectDetail.name
  );
}
