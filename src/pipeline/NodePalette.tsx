import { filmBaseRemoverStage, splitToningStage, vignetteStage } from '@/lib/utils';
import { Astroid, Camera, ChartColumn, CheckSquare, Cloud, FileImage, FileText, Film, FolderInput, FolderOutput, GitFork, Group, HardDrive, Image, Images, ImageUpscale, Info, MapPinned, Merge, Minus, MonitorUp, Palette, Plus, Split, Theater } from 'lucide-react';

export enum NodeType {
  Source = 'source',
  PdfSource = 'pdf-source',
  HotFolderRead = 'hot-folder-read',
  Webcam = 'webcam',
  ScreenShare = 'screen-share',
  GoogleDrive = 'google-drive',
  Information = 'information',
  SelectedPhoto = 'selected-photo',
  Grouper = 'grouper',
  ArraySwitch = 'array-switch',
  ArrayAnd = 'array-and',
  ArrayAndNot = 'array-and-not',
  ArrayOr = 'array-or',
  ImagePicker = 'image-picker',
  ExifSplit = 'exif-split',
  GpsSplit = 'gps-split',
  SplitChannels = 'split-channels',
  MergeChannels = 'merge-channels',
  Rescale = 'rescale',
  ResizeLimit = 'resize-limit',
  Collage = 'collage',
  Lut = 'lut',
  SplitToning = 'split-toning',
    FilmBaseRemover = 'film-base-remover',
  AiDenoiser = 'ai-denoiser',
  AiNegativeConverter = 'ai-negative-converter',
  Vignette = 'vignette',
  AiColorizer = 'ai-colorizer',
  AiPhotoEditor = 'ai-photo-editor',
  AskAi = 'ask-ai',
  Viewer = 'viewer',
  ViewerSingle = 'viewer-single',
  ExifViewer = 'exif-viewer',
  GpsMap = 'gps-map',
  PhotoHistogram = 'photo-histogram',
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
    type: NodeType.Webcam,
    labelKey: "Webcam", icon: <Camera size={16} />,
    processing: 'static',
    labelDescription: 'Captures the latest photo from your webcam.',
  },
  {
    type: NodeType.ScreenShare,
    labelKey: "Screen share", icon: <MonitorUp size={16} />,
    processing: 'static',
    labelDescription: 'Captures the latest image from a shared screen.',
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
    type: NodeType.ImagePicker,
    labelKey: "pipelineImagePicker", icon: <CheckSquare size={16} />,
    processing: 'static',
    labelDescription: 'pipelineImagePickerDescription',
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

const transformStages: Array<NodeStageItem> = [
  { type: "rescale", labelKey: "pipelineRescale", icon: <ImageUpscale size={16} />,
    processing: 'static',
    labelDescription: 'pipelineRescaleDescription',
  },
  { type: "resize-limit", labelKey: "pipelineResizeLimit", icon: <ImageUpscale size={16} />,
    processing: 'static',
    labelDescription: 'pipelineResizeLimitDescription',
  },
  { type: "collage", labelKey: "pipelineCollage", icon: <Images size={16} />,
    processing: 'static',
    labelDescription: 'pipelineCollageDescription',
  },
]

const lightStages: Array<NodeStageItem> = [
]

const colorStages: Array<NodeStageItem> = [
  { type: NodeType.FilmBaseRemover, labelKey: "pipelineFilmBaseRemover", icon: <Film size={16} />,
    algo: ({ maskColor, strength, densityCompensation, filmAge }: { maskColor: [number, number, number], strength: number, densityCompensation: number, filmAge: number, autoDetectBase?: boolean }) =>
      filmBaseRemoverStage(maskColor?.[0] ?? 255, maskColor?.[1] ?? 128, maskColor?.[2] ?? 48, strength ?? 100, densityCompensation ?? 0, filmAge ?? 0),
    configs: [
      { min: 0, max: 100, step: 1, defaultValue: 100, labelKey: 'pipelineFilmBaseStrength', key: 'strength' },
      { min: 0, max: 100, step: 1, defaultValue: 0, labelKey: 'pipelineFilmBaseDensityCompensation', key: 'densityCompensation' },
      { min: 0, max: 100, step: 1, defaultValue: 0, labelKey: 'pipelineFilmBaseAge', key: 'filmAge' },
    ],
    processing: 'math',
    labelDescription: 'pipelineFilmBaseRemoverDescription',
  },
  {
    type: NodeType.Lut, labelKey: "pipelineLut", icon: <Film size={16} />,
    processing: 'static',
    labelDescription: 'pipelineLutDescription'
  },
  { type: "split-toning", labelKey: "pipelineSplitToning", icon: <Palette size={16} />,
    algo: ({ shadowTint, highlightTint, strength }: { shadowTint: [number, number, number], highlightTint: [number, number, number], strength: number }) =>
      splitToningStage(shadowTint?.[0], shadowTint?.[1], shadowTint?.[2], highlightTint?.[0], highlightTint?.[1], highlightTint?.[2], strength),

    configs: [
      { min: 0, max: 10, step: 1, defaultValue: 50, labelKey: 'pipelineSplitToningStrength', key: 'strength' }
    ],
    processing: 'math',
    labelDescription: 'pipelineSplitToningDescription',
  },
  {
    type: NodeType.SplitChannels,
    labelKey: "pipelineSplitChannels", icon: <Split size={16} />,
    processing: 'static',
    labelDescription: 'pipelineSplitChannelsNodeDescription',
  },
  {
    type: NodeType.MergeChannels,
    labelKey: "pipelineMergeChannels", icon: <Merge size={16} />,
    processing: 'static',
    labelDescription: 'pipelineMergeChannelsNodeDescription',
  },
]

const detailStages: Array<NodeStageItem> = [
  { type: NodeType.AiDenoiser,
    labelKey: "pipelineAiDenoiser", icon: <Astroid size={16} />, ai: true,
    processing: NodeProcessing.Static,
    labelDescription: 'pipelineAiDenoiserDescription' },
]

const effectsStages: Array<NodeStageItem> = [
  { type: "vignette", labelKey: "pipelineVignette", icon: <Theater size={16} />,
    algo: ({ amount, color }: { amount: number, color: [number, number, number] }) => vignetteStage(amount, color),
    configs: [
      { min: 0, max: 100, step: 1, defaultValue: 0, labelKey: '', key: 'amount' }
    ],
    processing: 'math',
    labelDescription: 'pipelineVignetteDescription',
  },
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
    type: "photo-histogram", labelKey: "pipelinePhotoHistogram", icon: <ChartColumn size={16} />,
    processing: 'static', labelDescription: 'pipelinePhotoHistogramDescription'
  },
  {
    type: "hot-folder-write", labelKey: "pipelineHotFolder", icon: <FolderOutput size={16} />,
    processing: 'static', labelDescription: 'pipelineHotFolderWriteDescription' },
]

export const paletteItems: Array<NodePaletteItem> = [
  ...(sourceStages.map(stage => ({ ...stage, groupKey: "pipelineGroupInput" }))),
  ...(logicStages.map(stage => ({ ...stage, groupKey: "pipelineLogicInput" }))),
  ...(transformStages.map(stage => ({ ...stage, groupKey: "pipelineGroupTransform" }))),
  ...(lightStages.map(stage => ({ ...stage, groupKey: "pipelineGroupLight" }))),
  ...(colorStages.map(stage => ({ ...stage, groupKey: "pipelineGroupColor" }))),
  ...(detailStages.map(stage => ({ ...stage, groupKey: "pipelineGroupDetail" }))),
  ...(effectsStages.map(stage => ({ ...stage, groupKey: "pipelineGroupEffects" }))),
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
