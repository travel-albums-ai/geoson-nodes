import { Astroid, Cloud, FileImage, FileText, Film, FolderInput, FolderOutput, GitFork, Group, HardDrive, Image, Images, Info, MapPinned, Minus, Plus } from 'lucide-react';

export enum NodeType {
  Source = 'source',
  PdfSource = 'pdf-source',
  HotFolderRead = 'hot-folder-read',
  GoogleDrive = 'google-drive',
  Information = 'information',
  SelectedPhoto = 'selected-photo',
  Grouper = 'grouper',
  ArraySwitch = 'array-switch',
  ArrayAnd = 'array-and',
  ArrayAndNot = 'array-and-not',
  ArrayOr = 'array-or',
  ExifSplit = 'exif-split',
  GpsSplit = 'gps-split',
  AiDenoiser = 'ai-denoiser',
  AiNegativeConverter = 'ai-negative-converter',
  AiColorizer = 'ai-colorizer',
  AiPhotoEditor = 'ai-photo-editor',
  AskAi = 'ask-ai',
  Viewer = 'viewer',
  ViewerSingle = 'viewer-single',
  ExifViewer = 'exif-viewer',
  GpsMap = 'gps-map',
  HotFolderWrite = 'hot-folder-write',
}

export enum NodeProcessing {
  Math = 'math',
  Css = 'css',
  Static = 'static',
}

export type NodePaletteConfig = {
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;

  labelKey?: string;
  key: string,
};

export type NodeStageItem = {
  type: `${NodeType}`;
  labelKey: string;

  labelDescription: string;
  icon: React.ReactNode;
  ai?: boolean;
  algo?: any;
  config?: NodePaletteConfig;

  configs?: NodePaletteConfig[];

  processing?: `${NodeProcessing}`;
};
export type NodePaletteItem = NodeStageItem & {
  groupKey: string;
}

const sourceStages: Array<NodeStageItem> = [
  {
    type: NodeType.Source,
    labelKey: "pipelineLocalStorage", icon: <HardDrive size={16} />,
    processing: 'static',
    labelDescription: 'pipelineLocalStorageDescription',
  },
  {
    type: NodeType.PdfSource,
    labelKey: 'pipelinePdfSource', icon: <FileText size={16} />,
    processing: 'static',
    labelDescription: 'pipelinePdfSourceDescription',
  },
  {
    type: NodeType.HotFolderRead,
    labelKey: "pipelineHotFolder", icon: <FolderInput size={16} />,
    processing: 'static',
    labelDescription: 'pipelineHotFolderDescription',
  },
  {
    type: NodeType.GoogleDrive,
    labelKey: "pipelineGoogleDrive", icon: <Cloud size={16} />,
    processing: 'static',
    labelDescription: 'pipelineGoogleDriveDescription',
  },
  {
    type: NodeType.Information,
    labelKey: "pipelineInformation", icon: <Info size={16} />,
    processing: 'static',
    labelDescription: 'pipelineInformationNodeDescription',
  },
  {
    type: NodeType.SelectedPhoto,
    labelKey: "pipelineSelectedPhoto", icon: <Image size={16} />,
    processing: 'static',
    labelDescription: 'pipelineSelectedPhotoDescription',
  },
];

const logicStages: Array<NodeStageItem> = [
  {
    type: NodeType.Grouper,
    labelKey: "pipelineGrouper", icon: <Group size={16} />,
    processing: 'static',
    labelDescription: 'pipelineGrouperNodeDescription',
  },
  {
    type: NodeType.ArraySwitch,
    labelKey: "pipelineArraySwitch", icon: <GitFork size={16} />,
    processing: 'static',
    labelDescription: 'pipelineArraySwitchNodeDescription',
  },
  {
    type: NodeType.ArrayAnd,
    labelKey: "pipelineArrayAnd", icon: <GitFork size={16} />,
    processing: 'static',
    labelDescription: 'pipelineArrayAndNodeDescription',
  },
  {
    type: NodeType.ArrayAndNot,
    labelKey: "pipelineArrayAndNot", icon: <Minus size={16} />,
    processing: 'static',
    labelDescription: 'pipelineArrayAndNotNodeDescription',
  },
  {
    type: NodeType.ArrayOr,
    labelKey: "pipelineArrayOr", icon: <Plus size={16} />,
    processing: 'static',
    labelDescription: 'pipelineArrayOrNodeDescription',
  },
  {
    type: NodeType.ExifSplit,
    labelKey: "pipelineExifSplit", icon: <FileImage size={16} />,
    processing: 'static',
    labelDescription: 'pipelineExifSplitNodeDescription',
  },
  {
    type: NodeType.GpsSplit,
    labelKey: "pipelineGpsSplit", icon: <MapPinned size={16} />,
    processing: 'static',
    labelDescription: 'pipelineGpsSplitNodeDescription',
  },

]

const detailStages: Array<NodeStageItem> = [
  { type: NodeType.AiDenoiser,
    labelKey: "pipelineAiDenoiser", icon: <Astroid size={16} />, ai: true,
    processing: NodeProcessing.Static,
    labelDescription: 'pipelineAiDenoiserDescription' },
]
const aiStages: Array<NodeStageItem> = [
  { type: "ai-colorizer", labelKey: "pipelineAiColorizer", icon: <Astroid size={16} />,
    processing: 'static',
    labelDescription: 'pipelineAiColorizerDescription',
  },
  { type: NodeType.AiNegativeConverter, labelKey: "pipelineAiNegativeConverter", icon: <Film size={16} />,
    processing: 'static',
    labelDescription: 'pipelineAiNegativeConverterDescription',
  },
  { type: "ai-photo-editor", labelKey: "pipelineAiPhotoEditor", icon: <Astroid size={16} />,
    processing: 'static',
    labelDescription: 'pipelineAiPhotoEditorDescription',
  },
  { type: "ask-ai", labelKey: "pipelineAskAI", icon: <Astroid size={16} />,
    processing: 'static',
    labelDescription: 'pipelineAskAIDescription',
  },
]

const outputStages: Array<NodeStageItem> = [
  {
    type: "viewer", labelKey: "pipelinePhotosViewer", icon:<Images size={16} />,
    processing: 'static', labelDescription: 'pipelinePhotosViewerDescription'
  },
  {
    type: "viewer-single", labelKey: "pipelinePhotoViewer", icon: <Image size={16} />,
    processing: 'static', labelDescription: 'pipelinePhotoViewerDescription'
  },
  {
    type: "exif-viewer", labelKey: "pipelineExifViewer", icon: <FileImage size={16} />,
    processing: 'static', labelDescription: 'pipelineExifViewerDescription'
  },
  {
    type: "gps-map", labelKey: "pipelineGpsMap", icon: <MapPinned size={16} />,
    processing: 'static', labelDescription: 'pipelineGpsMapDescription'
  },
  {
    type: "hot-folder-write", labelKey: "pipelineHotFolder", icon: <FolderOutput size={16} />,
    processing: 'static', labelDescription: 'pipelineHotFolderWriteDescription' },
]

export const paletteItems: Array<NodePaletteItem> = [
  ...(sourceStages.map(stage => ({ ...stage, groupKey: "pipelineGroupInput" }))),
  ...(logicStages.map(stage => ({ ...stage, groupKey: "pipelineLogicInput" }))),
  ...(detailStages.map(stage => ({ ...stage, groupKey: "pipelineGroupDetail" }))),
  ...(aiStages.map(stage => ({ ...stage, groupKey: "pipelineGroupAi", ai: true }))),
  ...(outputStages.map(stage => ({ ...stage, groupKey: "pipelineGroupOutput" }))),
];

export const groupedPaletteItems = paletteItems.reduce((acc, item) => {
  if (!acc[item.groupKey]) {
    acc[item.groupKey] = [];
  }
  acc[item.groupKey].push(item);
  return acc;
}, {} as Record<string, NodePaletteItem[]>);

export const paletteItemsByType = paletteItems.reduce((acc, item) => {
  acc[item.type] = item;
  return acc;
}, {} as Record<string, NodePaletteItem>);
