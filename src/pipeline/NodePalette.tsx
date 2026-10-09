import { Blend, Braces, Combine, Crop, Diff, FileJson, GitFork, Layers, Link2, Merge, MapPinned, Palette, Plane, ScanSearch, SquaresIntersect, StickyNote } from 'lucide-react';

export enum NodeType {
  GeoJsonInput = 'geojson-input',
  FlightPath = 'flight-path',
  GeoBoundsFilter = 'geo-bounds-filter',
  GeoJsonWithinArea = 'geojson-within-area',
  GeoJsonMerge = 'geojson-merge',
  GeoJsonSwitch = 'geojson-switch',
  GeoJsonStyle = 'geojson-style',
  GeoJsonZip = 'geojson-zip',
  GeoJsonUnion = 'geojson-union',
  GeoJsonIntersection = 'geojson-intersection',
  GeoJsonDifference = 'geojson-difference',
  GeoJsonSymmetricDifference = 'geojson-symmetric-difference',
  GeoJsonJsonata = 'geojson-jsonata',
  GpsMap = 'gps-map',
  GeoJsonViewer = 'geojson-viewer',
  PostIt = 'post-it',
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
  {
    type: NodeType.FlightPath,
    labelKey: "pipelineFlightPath", icon: <Plane size={16} />,
    processing: 'static',
    labelDescription: 'pipelineFlightPathDescription',
  },
];

const filterStages: Array<NodeStageItem> = [
  {
    type: NodeType.GeoBoundsFilter, labelKey: "pipelineGpsBoundsFilter", icon: <Crop size={16} />,
    processing: 'static', labelDescription: 'pipelineGpsBoundsFilterDescription'
  },
  {
    type: NodeType.GeoJsonWithinArea, labelKey: "pipelineGeoJsonWithinArea", icon: <ScanSearch size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonWithinAreaDescription'
  },
];

const utilityStages: Array<NodeStageItem> = [
  {
    type: NodeType.GeoJsonMerge, labelKey: "pipelineGeoJsonMerge", icon: <Merge size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonMergeDescription'
  },
  {
    type: NodeType.GeoJsonSwitch, labelKey: "pipelineGeoJsonSwitch", icon: <GitFork size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonSwitchDescription'
  },
  {
    type: NodeType.GeoJsonStyle, labelKey: "pipelineGeoJsonStyle", icon: <Palette size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonStyleDescription'
  },
  {
    type: NodeType.GeoJsonZip, labelKey: "pipelineGeoJsonZip", icon: <Link2 size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonZipDescription'
  },
  {
    type: NodeType.GeoJsonUnion, labelKey: "pipelineGeoJsonUnion", icon: <Combine size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonUnionDescription'
  },
  {
    type: NodeType.GeoJsonIntersection, labelKey: "pipelineGeoJsonIntersection", icon: <SquaresIntersect size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonIntersectionDescription'
  },
  {
    type: NodeType.GeoJsonDifference, labelKey: "pipelineGeoJsonDifference", icon: <Diff size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonDifferenceDescription'
  },
  {
    type: NodeType.GeoJsonSymmetricDifference, labelKey: "pipelineGeoJsonSymmetricDifference", icon: <Blend size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonSymmetricDifferenceDescription'
  },
  {
    type: NodeType.GeoJsonJsonata, labelKey: "pipelineGeoJsonJsonata", icon: <Braces size={16} />,
    processing: 'static', labelDescription: 'pipelineGeoJsonJsonataDescription'
  },
  {
    type: NodeType.PostIt, labelKey: "pipelinePostIt", icon: <StickyNote size={16} />,
    processing: 'static', labelDescription: 'pipelinePostItDescription'
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
