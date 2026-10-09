import { Braces, Crop, FileJson, Layers, Merge, MapPinned } from 'lucide-react';

export enum NodeType {
  GeoJsonInput = 'geojson-input',
  GeoBoundsFilter = 'geo-bounds-filter',
  GeoJsonMerge = 'geojson-merge',
  GeoJsonJsonata = 'geojson-jsonata',
  GpsMap = 'gps-map',
  GeoJsonViewer = 'geojson-viewer',
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
    type: NodeType.GeoJsonInput,
    labelKey: "pipelineGeoJsonInput", icon: <FileJson size={16} />,
    processing: 'static',
    labelDescription: 'pipelineGeoJsonInputDescription',
  },
];

const filterStages: Array<NodeStageItem> = [
  {
    type: NodeType.GeoBoundsFilter, labelKey: "pipelineGpsBoundsFilter", icon: <Crop size={16} />,
    processing: 'static', labelDescription: 'pipelineGpsBoundsFilterDescription'
  },
];

const utilityStages: Array<NodeStageItem> = [
  {
    type: NodeType.GeoJsonMerge, labelKey: "pipelineGeoJsonMerge", icon: <Merge size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonMergeDescription'
  },
  {
    type: NodeType.GeoJsonJsonata, labelKey: "pipelineGeoJsonJsonata", icon: <Braces size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonJsonataDescription'
  },
];

const outputStages: Array<NodeStageItem> = [
  {
    type: NodeType.GpsMap, labelKey: "pipelineGpsMap", icon: <MapPinned size={16} />,
    processing: 'static', labelDescription: 'pipelineGpsMapDescription'
  },
  {
    type: NodeType.GeoJsonViewer, labelKey: "pipelineGeoJsonViewer", icon: <Layers size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonViewerDescription'
  },
]

export const paletteItems: Array<NodePaletteItem> = [
  ...(sourceStages.map(stage => ({ ...stage, groupKey: "pipelineGroupInput" }))),
  ...(filterStages.map(stage => ({ ...stage, groupKey: "pipelineGroupFilter" }))),
  ...(utilityStages.map(stage => ({ ...stage, groupKey: "pipelineGroupUtility" }))),
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
