import create, { GetState, SetState } from "zustand";
import { TextCustomizationSettingType } from "../Editor/AudioTimeline/Tools/types";
import {
  DEFAULT_TEXT_PREVIEW_HEIGHT,
  DEFAULT_TEXT_PREVIEW_WIDTH,
  LyricText,
} from "../Editor/types";
import { sample } from "../sampledata";
import { Project, ProjectDetail } from "./types";
import { VisualizerSetting } from "../Editor/Visualizer/store";
import { ImageItem } from "../Editor/Image/Imported/ImportImageButton";

const LYRIC_REFERENCE_VIEW_WIDTH = 380;
const SETTINGS_SIDE_PANEL_VIEW_WIDTH = 350;
const EXTRA_LYRIC_PREVIEW_WIDTH = -20;
const LYRIC_PREVIEW_MAX_WIDTH =
  LYRIC_REFERENCE_VIEW_WIDTH +
  SETTINGS_SIDE_PANEL_VIEW_WIDTH -
  EXTRA_LYRIC_PREVIEW_WIDTH;

export interface ProjectStore {
  editingProject?: ProjectDetail;
  setEditingProject: (project?: ProjectDetail) => void;
  isPopupOpen: boolean;
  setIsPopupOpen: (isOpen: boolean) => void;
  isCreateNewProjectPopupOpen: boolean;
  setIsCreateNewProjectPopupOpen: (isOpen: boolean) => void;
  isEditProjectPopupOpen: boolean;
  setIsEditProjectPopupOpen: (isOpen: boolean) => void;
  isLoadProjectPopupOpen: boolean;
  setIsLoadProjectPopupOpen: (isOpen: boolean) => void;

  lyricTexts: LyricText[];
  updateLyricTexts: (newLyricTexts: LyricText[]) => void;
  addNewLyricText: (
    text: string,
    start: number,
    isImage: boolean,
    imageUrl: string | undefined,
    isVisualizer: boolean,
    visualizerSettings: VisualizerSetting | undefined
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

  leftSidePanelMaxWidth: number;
  setLeftSidePanelMaxWidth: (width: number) => void;

  lyricsPreviewMaxWidth: number;
  setLyricsPreviewMaxWidth: (width: number) => void;

  rightSidePanelMaxWidth: number;
  setRightSidePanelMaxWidth: (width: number) => void;

  images: ImageItem[];
  setImages: (images: ImageItem[]) => void;
  addImages: (newImages: ImageItem[]) => void;
  removeImagesById: (idsToRemove: string[]) => void;

  isStaticSyncMode?: boolean;
  setToggleIsStaticSyncMode: () => void;
}

export const useProjectStore = create(
  (set: SetState<ProjectStore>, get: GetState<ProjectStore>): ProjectStore => ({
    editingProject: undefined,
    setEditingProject: (project?: ProjectDetail) => {
      set({ editingProject: project });
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
    updateLyricTexts: (newLyricTexts: LyricText[]) => {
      const { lyricTexts, lyricTextsHistory } = get();
      lyricTextsHistory.push(lyricTexts);

      set({
        lyricTexts: newLyricTexts,
        lyricTextsHistory,
      });
    },
    addNewLyricText: (
      text: string,
      start: number,
      isImage: boolean,
      imageUrl: string | undefined,
      isVisualizer: boolean,
      visualizerSettings: VisualizerSetting | undefined
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
        isVisualizer,
        visualizerSettings,
      };
      let newLyricTexts = [...lyricTexts, lyricTextToBeAdded];
      newLyricTexts.sort((a, b) => a.start - b.start);
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

    leftSidePanelMaxWidth: LYRIC_REFERENCE_VIEW_WIDTH,
    setLeftSidePanelMaxWidth(width) {
      set({
        leftSidePanelMaxWidth: width,
      });
    },
    rightSidePanelMaxWidth: SETTINGS_SIDE_PANEL_VIEW_WIDTH,
    setRightSidePanelMaxWidth(width) {
      set({
        rightSidePanelMaxWidth: width,
      });
    },
    lyricsPreviewMaxWidth: LYRIC_PREVIEW_MAX_WIDTH,
    setLyricsPreviewMaxWidth(width) {},

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
  })
);

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

export const deleteProject = (project: Project) => {
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

export function isProjectExist(projectDetail: ProjectDetail) {
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");

  let existingProjects: Project[] | undefined = undefined;

  if (existingLocalProjects) {
    existingProjects = JSON.parse(existingLocalProjects) as Project[];
    const duplicateProjectIndex = existingProjects.findIndex(
      (savedProject: Project) =>
        projectDetail.name === savedProject.projectDetail.name
    );

    return duplicateProjectIndex !== undefined && duplicateProjectIndex >= 0;
  }

  return false;
}

export const loadProjects = (demoOnly?: boolean): Project[] => {
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");
  const sampleProjects = sample as unknown as Project[];

  if (demoOnly) {
    return sampleProjects;
  }

  if (existingLocalProjects) {
    const localProjects = JSON.parse(existingLocalProjects) as Project[];
    return [...localProjects, ...sampleProjects];
  }

  return sampleProjects;
};

export const generateLyricTextId = () => {
  return new Date().getTime() + window.performance.now();
};
