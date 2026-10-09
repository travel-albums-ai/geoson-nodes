import { Astroid, FileJson, FolderInput, FolderOutput, GitFork, Group, HardDrive, Image, Images, MapPinned, Minus, Plus } from 'lucide-react';

export enum NodeType {
  Source = 'source',
  HotFolderRead = 'hot-folder-read',
  GeoJsonInput = 'geojson-input',
  Grouper = 'grouper',
  ArraySwitch = 'array-switch',
  ArrayAnd = 'array-and',
  ArrayAndNot = 'array-and-not',
  ArrayOr = 'array-or',
  GpsSplit = 'gps-split',
  AiPhotoEditor = 'ai-photo-editor',
  AskAi = 'ask-ai',
  Viewer = 'viewer',
  ViewerSingle = 'viewer-single',
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
    type: NodeType.HotFolderRead,
    labelKey: "pipelineHotFolder", icon: <FolderInput size={16} />,
    processing: 'static',
    labelDescription: 'pipelineHotFolderDescription',
  },
  {
    type: NodeType.GeoJsonInput,
    labelKey: "pipelineGeoJsonInput", icon: <FileJson size={16} />,
    processing: 'static',
    labelDescription: 'pipelineGeoJsonInputDescription',
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
    type: NodeType.GpsSplit,
    labelKey: "pipelineGpsSplit", icon: <MapPinned size={16} />,
    processing: 'static',
    labelDescription: 'pipelineGpsSplitNodeDescription',
  },

]

const aiStages: Array<NodeStageItem> = [
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
