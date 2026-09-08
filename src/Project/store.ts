import create, { GetState, SetState } from "zustand";
import { TextCustomizationSettingType } from "../Editor/AudioTimeline/Tools/types";
import {
  DEFAULT_TEXT_PREVIEW_HEIGHT,
  DEFAULT_TEXT_PREVIEW_WIDTH,
  LyricText,
} from "../Editor/types";
import { Project, ProjectDetail } from "./types";
import { VisualizerSetting } from "../Editor/Visualizer/store";
import { ImageItem } from "../Editor/Image/Imported/ImportImageButton";
import { useAuthStore } from "../Auth/store";
import { normalizeLyricTextTimelineLevels } from "../Editor/AudioTimeline/utils";
import { useEditorStore } from "../Editor/store";
import { LightSettings } from "../Editor/Light/store";
import { GrainSettings } from "../Editor/Grain/store";
import { getCenteredTextPosition } from "../Editor/Lyrics/LyricPreview/textCentering";
import { ParticleSettings } from "../Editor/Particles/store";
import {
  CameraSettings,
  normalizeCameraSettings,
} from "../Editor/Camera/store";
import {
  loadProjectsFromFirestore,
  isProjectExistInFirestore,
  deleteProjectFromFirestore,
} from "./firestoreProjectService";
import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import { getDemoProjects } from "./demoProjects";
import { EditorLayout, normalizeEditorLayout } from "../Editor/editorLayout";
import { captureEditorWorkspace, resolveWorkspaceTimeline } from "../Editor/editorWorkspace";
import { getCurrentAudioPosition } from "../Editor/AudioTimeline/useAudioPosition";

export function getEditorLayoutForSave(): EditorLayout {
  return normalizeEditorLayout({
    ...useProjectStore.getState().editorLayout,
    playheadPosition: useEditorStore.getState().pendingWorkspaceRestore?.playheadPosition
      ?? getCurrentAudioPosition(),
  });
}

export function completeTimelineWorkspaceRestore(
  pending: EditorLayout,
  viewportWidth: number,
  duration: number,
  seek: (position: number) => void
) {
  if (useEditorStore.getState().pendingWorkspaceRestore !== pending || viewportWidth <= 0 || duration <= 0) return;
  // Keep edits made while audio was loading; only normalize the saved baseline
  // from the original pending snapshot, so those edits remain unsaved.
  const restored = resolveWorkspaceTimeline(useProjectStore.getState().editorLayout, viewportWidth, duration);
  const saved = resolveWorkspaceTimeline(pending, viewportWidth, duration);
  seek(restored.position);
  if (useEditorStore.getState().pendingWorkspaceRestore !== pending) return;
  useEditorStore.setState({
    timelineInteractionState: restored.interaction,
    timelineLayerY: -900 * restored.layout.timelineScrollY,
    timelineLoopRange: restored.loopRange,
    pendingWorkspaceRestore: null,
  });
  useProjectStore.getState().finishTimelineRestore(restored.layout, saved.layout);
  return restored;
}

export interface EditingProjectAccess {
  source?: Project["source"];
  ownerUid?: string;
  canSave: boolean;
  shouldWarnOnLoad: boolean;
}

// A completed async save records the layout it sent, so subsequent resizes
// remain dirty even if they happened while the request was in flight.
export function getSavedProjectSnapshot(savedLayout?: EditorLayout) {
  const projectState = useProjectStore.getState();
  const aiState = useAIImageGeneratorStore.getState();

  return JSON.stringify({
    // Playback alone must not dirty the project every frame.
    editorLayout: { ...(savedLayout ?? projectState.editorLayout), playheadPosition: 0 },
    lyricTexts: projectState.lyricTexts,
    lyricReference:
      projectState.unSavedLyricReference ?? projectState.lyricReference ?? "",
    images: projectState.images,
    generatedImageLog: aiState.generatedImageLog,
  });
}

export function resetProjectEditorState() {
  useAIImageGeneratorStore.getState().reset();
  useEditorStore.getState().resetProjectUiState();
  // New projects also initialize once audio is ready, without dirtying the
  // freshly created project when the full-song loop range becomes known.
  useEditorStore.setState({ pendingWorkspaceRestore: normalizeEditorLayout() });

  useProjectStore.setState({
    editingProject: undefined,
    editingProjectId: undefined,
    editingProjectAccess: undefined,
    projectActionMessage: undefined,
    lyricTexts: [],
    lyricReference: undefined,
    unSavedLyricReference: undefined,
    lyricTextsHistory: [],
    lyricTextsLastUndoHistory: [],
    images: [],
    isEditing: false,
    isStaticSyncMode: false,
    autoPlayRequested: false,
    savedLyricTextsSnapshot: "[]",
    editorLayout: normalizeEditorLayout(),
  });

  useProjectStore.getState().markAsSaved();
}

function isProjectInLocalStorage(projectDetail: ProjectDetail): boolean {
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");

  if (!existingLocalProjects) {
    return false;
  }

  const existingProjects = JSON.parse(existingLocalProjects) as Project[];
  return existingProjects.some(
    (savedProject) =>
      projectDetail.name.toLowerCase() === savedProject.projectDetail.name.toLowerCase()
  );
}

export async function resolveEditingProjectAccess(
  project?: Project
): Promise<EditingProjectAccess | undefined> {
  if (!project) {
    return undefined;
  }

  const user = useAuthStore.getState().user;
  const isOwnedByCurrentUser = Boolean(user && project.uid && project.uid === user.uid);
  const existsLocally = isProjectInLocalStorage(project.projectDetail);
  const existsInCloud = Boolean(
    user && (await isProjectExistInFirestore(user.uid, project.projectDetail))
  );
  const canSave =
    project.projectDetail.name.includes("(Demo)") ||
    existsLocally ||
    isOwnedByCurrentUser ||
    existsInCloud;

  return {
    source: project.source,
    ownerUid: project.uid,
    canSave,
    shouldWarnOnLoad: !canSave,
  };
}

function normalizeProject(project: Project): Project {
  const createdDate = new Date(project.projectDetail.createdDate);
  const updatedDate = project.projectDetail.updatedDate
    ? new Date(project.projectDetail.updatedDate)
    : createdDate;

  return {
    ...project,
    projectDetail: {
      ...project.projectDetail,
      createdDate,
      updatedDate,
    },
  };
}

export interface ProjectStore {
  previewProject?: Project;
  setPreviewProject: (project?: Project) => void;
  editingProject?: ProjectDetail;
  editingProjectId?: string;
  setEditingProject: (project?: ProjectDetail) => void;
  editingProjectAccess?: EditingProjectAccess;
  setEditingProjectAccess: (access?: EditingProjectAccess) => void;
  projectActionMessage?: string;
  setProjectActionMessage: (message?: string) => void;
  isPopupOpen: boolean;
  setIsPopupOpen: (isOpen: boolean) => void;
  isCreateNewProjectPopupOpen: boolean;
  setIsCreateNewProjectPopupOpen: (isOpen: boolean) => void;
  isEditProjectPopupOpen: boolean;
  setIsEditProjectPopupOpen: (isOpen: boolean) => void;
  isLoadProjectPopupOpen: boolean;
  setIsLoadProjectPopupOpen: (isOpen: boolean) => void;

  lyricTexts: LyricText[];
  updateLyricTexts: (
    newLyricTexts: LyricText[],
    normalizeLayout?: boolean
  ) => void;
  previewLyricTexts: (
    newLyricTexts: LyricText[],
    normalizeLayout?: boolean
  ) => void;
  commitLyricTextsPreview: (previousLyricTexts: LyricText[]) => void;
  addNewLyricText: (
    text: string,
    start: number,
    isImage: boolean,
    imageUrl: string | undefined,
    isVisualizer: boolean,
    visualizerSettings: VisualizerSetting | undefined,
    isParticle?: boolean,
    particleSettings?: ParticleSettings,
    isLight?: boolean,
    lightSettings?: LightSettings,
    isGrain?: boolean,
    grainSettings?: GrainSettings,
    isCamera?: boolean,
    cameraSettings?: CameraSettings
  ) => void;
  isEditing: boolean;
  updateEditingStatus: () => void;
  modifyLyricTexts: (
    type: TextCustomizationSettingType,
    ids: number[],
    value: any
  ) => void;
  modifyVisualizerSettings: (
    type: keyof VisualizerSetting,
    ids: number[],
    value: any
  ) => void;
  modifyParticleSettings: (
    type: keyof ParticleSettings,
    ids: number[],
    value: any
  ) => void;
  modifyLightSettings: (
    type: keyof LightSettings,
    ids: number[],
    value: any
  ) => void;
  modifyGrainSettings: (
    type: keyof GrainSettings,
    ids: number[],
    value: any
  ) => void;
  modifyCameraSettings: (
    type: keyof CameraSettings,
    ids: number[],
    value: any
  ) => void;

  lyricReference?: string;
  setLyricReference: (lyricReference?: string) => void;
  unSavedLyricReference?: string;
  setUnsavedLyricReference: (lyricReference?: string) => void;

  existingProjects: Project[];
  setExistingProjects: (projects: Project[]) => void;

  lyricTextsHistory: LyricText[][];
  undoLyricTextEdit: () => void;

  lyricTextsLastUndoHistory: LyricText[];
  redoLyricTextUndo: () => void;

  editorLayout: EditorLayout;
  updateEditorLayout: (layout: Partial<EditorLayout>) => void;
  finishTimelineRestore: (layout: Partial<EditorLayout>, savedLayout?: Partial<EditorLayout>) => void;

  images: ImageItem[];
  setImages: (images: ImageItem[]) => void;
  addImages: (newImages: ImageItem[]) => void;
  removeImagesById: (idsToRemove: string[]) => void;

  isStaticSyncMode?: boolean;
  setToggleIsStaticSyncMode: () => void;

  autoPlayRequested: boolean;
  setAutoPlayRequested: (value: boolean) => void;

  savedLyricTextsSnapshot: string;
  markAsSaved: (savedLayout?: EditorLayout) => void;
}

export const useProjectStore = create(
  (set: SetState<ProjectStore>, get: GetState<ProjectStore>): ProjectStore => ({
    previewProject: undefined,
    setPreviewProject: (project?: Project) => {
      set({ previewProject: project });
    },
    editingProject: undefined,
    editingProjectId: undefined,
    setEditingProject: (project?: ProjectDetail) => {
      set({ editingProject: project });
    },
    editingProjectAccess: undefined,
    setEditingProjectAccess: (access?: EditingProjectAccess) => {
      set({ editingProjectAccess: access });
    },
    projectActionMessage: undefined,
    setProjectActionMessage: (message?: string) => {
      set({ projectActionMessage: message });
    },
    isPopupOpen: false,
    setIsPopupOpen: (isOpen: boolean) => {
      set({ isPopupOpen: isOpen });
    },
    isCreateNewProjectPopupOpen: false,
    setIsCreateNewProjectPopupOpen: (isOpen: boolean) => {
      set({ isCreateNewProjectPopupOpen: isOpen });
    },
    isEditProjectPopupOpen: false,
    setIsEditProjectPopupOpen: (isOpen: boolean) => {
      set({ isEditProjectPopupOpen: isOpen });
    },
    isLoadProjectPopupOpen: false,
    setIsLoadProjectPopupOpen: (isOpen: boolean) => {
      set({ isLoadProjectPopupOpen: isOpen });
    },
    lyricTexts: [],
    updateLyricTexts: (
      newLyricTexts: LyricText[],
      normalizeLayout: boolean = true
    ) => {
      const { lyricTexts, lyricTextsHistory } = get();
      lyricTextsHistory.push(lyricTexts);

      const nextLyricTexts = normalizeLayout
        ? normalizeLyricTextTimelineLevels(newLyricTexts)
        : newLyricTexts;

      set({
        lyricTexts: nextLyricTexts,
        lyricTextsHistory,
      });
    },
    previewLyricTexts: (
      newLyricTexts: LyricText[],
      normalizeLayout: boolean = true
    ) => {
      set({
        lyricTexts: normalizeLayout
          ? normalizeLyricTextTimelineLevels(newLyricTexts)
          : newLyricTexts,
      });
    },
    commitLyricTextsPreview: (previousLyricTexts: LyricText[]) => {
      const { lyricTextsHistory } = get();
      set({
        lyricTextsHistory: [...lyricTextsHistory, previousLyricTexts],
        lyricTextsLastUndoHistory: [],
      });
    },
    addNewLyricText: (
      text: string,
      start: number,
      isImage: boolean,
      imageUrl: string | undefined,
      isVisualizer: boolean,
      visualizerSettings: VisualizerSetting | undefined,
      isParticle: boolean = false,
      particleSettings: ParticleSettings | undefined = undefined,
      isLight: boolean = false,
      lightSettings: LightSettings | undefined = undefined,
      isGrain: boolean = false,
      grainSettings: GrainSettings | undefined = undefined,
      isCamera: boolean = false,
      cameraSettings: CameraSettings | undefined = undefined
    ) => {
      const { lyricTexts, lyricTextsHistory } = get();
      const lyricTextToBeAdded: LyricText = {
        id: generateLyricTextId(),
        start,
        end: start + 1,
        text,
        textY: 0.5,
        textX: 0.5,
        textBoxTimelineLevel: getNewTextLevel(start, start + 1, lyricTexts),
        isImage,
        imageUrl,
        fontName: "Inter Variable",
        fontWeight: 400,
        renderEnabled: true,
        itemOpacity: 1,
        isVisualizer,
        visualizerSettings,
        isParticle,
        particleSettings,
        isLight,
        lightSettings,
        isGrain,
        grainSettings,
        isCamera,
        cameraSettings,
        elementType: isVisualizer
          ? "visualizer"
          : isParticle
          ? "particle"
          : isLight
          ? "light"
          : isGrain
          ? "grain"
          : isCamera
          ? "camera"
          : undefined,
        imageOpacity: isImage ? 1 : undefined,
      };

      if (
        !isImage &&
        !isVisualizer &&
        !isParticle &&
        !isLight &&
        !isGrain &&
        !isCamera
      ) {
        const previewContainerRef = useEditorStore.getState().previewContainerRef;

        if (previewContainerRef) {
          const previewWidth = Math.max(1, previewContainerRef.clientWidth);
          const previewHeight = Math.max(1, previewContainerRef.clientHeight);
          const centeredPosition = getCenteredTextPosition({
            lyricText: lyricTextToBeAdded,
            previewWidth,
            previewHeight,
          });

          lyricTextToBeAdded.textX = centeredPosition.textX;
          lyricTextToBeAdded.textY = centeredPosition.textY;
        }
      }

      let newLyricTexts = [...lyricTexts, lyricTextToBeAdded];
      newLyricTexts.sort((a, b) => a.start - b.start);
      newLyricTexts = normalizeLyricTextTimelineLevels(newLyricTexts);
      let newLyricTextsHistory = [...lyricTextsHistory];
      newLyricTextsHistory.push(lyricTexts);

      set({
        lyricTexts: newLyricTexts,
        lyricTextsHistory: newLyricTextsHistory,
      });
    },
    isEditing: false,
    updateEditingStatus: () => {
      const { isEditing } = get();

      set({ isEditing: !isEditing });
    },
    modifyLyricTexts: (
      type: TextCustomizationSettingType,
      ids: number[],
      value: any
    ) => {
      const { lyricTexts } = get();
      const updateLyricTexts = lyricTexts.map(
        (curLoopLyricText: LyricText, updatedIndex: number) => {
          if (ids.includes(curLoopLyricText.id)) {
            return {
              ...curLoopLyricText,
              [type]: value,
            };
          }

          return curLoopLyricText;
        }
      );

      set({ lyricTexts: updateLyricTexts });
    },
    modifyVisualizerSettings(
      type: keyof VisualizerSetting,
      ids: number[],
      value: any
    ) {
      const { lyricTexts } = get();
      const updateLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (
          ids.includes(curLoopLyricText.id) &&
          curLoopLyricText.visualizerSettings
        ) {
          return {
            ...curLoopLyricText,
            visualizerSettings: {
              ...curLoopLyricText.visualizerSettings,
              [type]: value,
            },
          };
        }

        return curLoopLyricText;
      });

      set({ lyricTexts: updateLyricTexts });
    },
    modifyParticleSettings(
      type: keyof ParticleSettings,
      ids: number[],
      value: any
    ) {
      const { lyricTexts } = get();
      const updateLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (
          ids.includes(curLoopLyricText.id) &&
          curLoopLyricText.particleSettings
        ) {
          return {
            ...curLoopLyricText,
            particleSettings: {
              ...curLoopLyricText.particleSettings,
              [type]: value,
            },
          };
        }

        return curLoopLyricText;
      });

      set({ lyricTexts: updateLyricTexts });
    },
    modifyLightSettings(type: keyof LightSettings, ids: number[], value: any) {
      const { lyricTexts } = get();
      const updateLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (ids.includes(curLoopLyricText.id) && curLoopLyricText.lightSettings) {
          return {
            ...curLoopLyricText,
            lightSettings: {
              ...curLoopLyricText.lightSettings,
              [type]: value,
            },
          };
        }

        return curLoopLyricText;
      });

      set({ lyricTexts: updateLyricTexts });
    },
    modifyGrainSettings(type: keyof GrainSettings, ids: number[], value: any) {
      const { lyricTexts } = get();
      const updateLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (ids.includes(curLoopLyricText.id) && curLoopLyricText.grainSettings) {
          return {
            ...curLoopLyricText,
            grainSettings: {
              ...curLoopLyricText.grainSettings,
              [type]: value,
            },
          };
        }

        return curLoopLyricText;
      });

      set({ lyricTexts: updateLyricTexts });
    },
    modifyCameraSettings(
      type: keyof CameraSettings,
      ids: number[],
      value: any
    ) {
      const { lyricTexts } = get();
      const updateLyricTexts = lyricTexts.map((item) => {
        const isCameraItem = item.isCamera || item.elementType === "camera";

        if (ids.includes(item.id) && isCameraItem) {
          return {
            ...item,
            cameraSettings: {
              ...normalizeCameraSettings(item.cameraSettings),
              [type]: value,
            },
          };
        }

        return item;
      });

      set({ lyricTexts: updateLyricTexts });
    },
    lyricReference: undefined,
    setLyricReference: (lyricReference?: string) => {
      set({ lyricReference });
    },
    unSavedLyricReference: undefined,
    setUnsavedLyricReference: (lyricReference?: string) => {
      set({ unSavedLyricReference: lyricReference });
    },
    existingProjects: [],
    setExistingProjects: (projects: Project[]) => {
      set({ existingProjects: projects });
    },
    lyricTextsHistory: [],
    undoLyricTextEdit: () => {
      const { lyricTextsHistory, lyricTexts } = get();
      const lastHistory = lyricTextsHistory.pop();

      if (lastHistory && lastHistory.length > 0) {
        set({
          lyricTexts: lastHistory,
          lyricTextsHistory,
          lyricTextsLastUndoHistory: lyricTexts,
        });
      }
    },
    lyricTextsLastUndoHistory: [],
    redoLyricTextUndo: () => {
      const { lyricTextsLastUndoHistory } = get();

      if (lyricTextsLastUndoHistory.length > 0) {
        set({
          lyricTexts: lyricTextsLastUndoHistory,
          lyricTextsLastUndoHistory: [],
        });
      }
    },

    editorLayout: normalizeEditorLayout(),
    updateEditorLayout: (layout) => {
      set(state => ({
        editorLayout: normalizeEditorLayout({ ...state.editorLayout, ...layout }),
      }));
    },
    finishTimelineRestore: (layout, savedLayout = layout) => {
      set(state => {
        let savedLyricTextsSnapshot = state.savedLyricTextsSnapshot;
        if (savedLyricTextsSnapshot.startsWith("{")) {
          const saved = JSON.parse(savedLyricTextsSnapshot);
          saved.editorLayout = normalizeEditorLayout({ ...saved.editorLayout, ...savedLayout, playheadPosition: 0 });
          savedLyricTextsSnapshot = JSON.stringify(saved);
        }
        return {
          editorLayout: normalizeEditorLayout({ ...state.editorLayout, ...layout }),
          savedLyricTextsSnapshot,
        };
      });
    },

    images: [],
    setImages(images) {
      set({
        images,
      });
    },
    addImages(newImages) {
      set((state) => ({
        images: [...state.images, ...newImages],
      }));
    },
    removeImagesById(idsToRemove) {
      set((state) => ({
        images: state.images.filter((image) => !idsToRemove.includes(image.id)),
      }));
    },

    isStaticSyncMode: false,
    setToggleIsStaticSyncMode() {
      set((state) => ({ isStaticSyncMode: !state.isStaticSyncMode }));
    },

    autoPlayRequested: false,
    setAutoPlayRequested: (value: boolean) => {
      set({ autoPlayRequested: value });
    },

    savedLyricTextsSnapshot: "[]",
    markAsSaved: (savedLayout) => {
      set({ savedLyricTextsSnapshot: getSavedProjectSnapshot(savedLayout) });
    },
  })
);

// Mirror durable workspace changes, not cursor animation, drag previews or DOM refs.
useEditorStore.subscribe((state, previous) => {
  if (state.pendingWorkspaceRestore !== previous.pendingWorkspaceRestore || !useProjectStore.getState().editingProject) return;
  const next = captureEditorWorkspace(state);
  if (JSON.stringify(next) !== JSON.stringify(captureEditorWorkspace(previous))) {
    useProjectStore.getState().updateEditorLayout(next);
  }
});

// level should be 1 level higher that the highest overlapping text box
function getNewTextLevel(start: number, end: number, lyricTexts: LyricText[]) {
  const overlappingLyricTexts = lyricTexts.filter((lyricText) => {
    let isOverlapping: boolean = false;
    if (
      (lyricText.start <= start && lyricText.end >= end) ||
      (start >= lyricText.start && start <= lyricText.end) ||
      (end >= lyricText.start && end <= lyricText.end)
    ) {
      isOverlapping = true;
    }
    return isOverlapping;
  });

  if (overlappingLyricTexts.length === 0) {
    return 1;
  }

  return (
    overlappingLyricTexts.reduce((prev, cur) =>
      prev.textBoxTimelineLevel > cur.textBoxTimelineLevel ? prev : cur
    ).textBoxTimelineLevel + 1
  );
}

export const deleteProject = async (project: Project) => {
  const { user } = useAuthStore.getState();
  const projectOwnerId = (project as Project & { uid?: string }).uid;

  if (user && (project.source === "cloud" || projectOwnerId === user.uid)) {
    await deleteProjectFromFirestore(user.uid, project);
    return;
  }

  const existingLocalProjects = localStorage.getItem("lyrictorProjects");

  let existingProjects: Project[] | undefined = undefined;

  if (existingLocalProjects) {
    existingProjects = JSON.parse(existingLocalProjects) as Project[];
  }

  if (existingProjects) {
    localStorage.setItem(
      "lyrictorProjects",
      JSON.stringify(
        existingProjects.filter(
          (loopProject) =>
            loopProject.projectDetail.name !== project.projectDetail.name
        )
      )
    );
  }
};

export async function isProjectExist(projectDetail: ProjectDetail): Promise<boolean> {
  const { user, storagePreference } = useAuthStore.getState();

  if (user && storagePreference === "cloud") {
    return await isProjectExistInFirestore(user.uid, projectDetail);
  }

  return isProjectInLocalStorage(projectDetail);
}

export const loadProjects = async (demoOnly?: boolean): Promise<Project[]> => {
  const { user, storagePreference } = useAuthStore.getState();
  const demoProjects = getDemoProjects();

  if (demoOnly) {
    return demoProjects.map((p) => ({
      ...normalizeProject(p),
      source: "demo" as const,
    }));
  }

  const sampleProjects = demoProjects.map((p) => ({
    ...normalizeProject(p),
    source: "demo" as const,
  }));

  let userProjects: Project[] = [];

  // Cloud load
  if (user && storagePreference === "cloud") {
    const cloudProjects = await loadProjectsFromFirestore(user.uid);
    userProjects = [...userProjects, ...cloudProjects.map(p => ({ ...p, source: "cloud" as const }))];
  }

  // Local load
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");
  if (existingLocalProjects) {
    const localProjects = JSON.parse(existingLocalProjects) as Project[];
    userProjects = [
      ...userProjects,
      ...localProjects.map((p) => ({
        ...normalizeProject(p),
        source: "local" as const,
      })),
    ];
  }

  return [...userProjects, ...sampleProjects];
};

export const generateLyricTextId = () => {
  return new Date().getTime() + window.performance.now();
};
