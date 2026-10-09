export const samplePipeline = [
  {
    "nodes": [
      {
        "id": "source-1",
        "type": "source",
        "position": {
          "x": -700,
          "y": 920
        },
        "data": {},
        "measured": {
          "width": 934,
          "height": 1037
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "source-2",
        "type": "source",
        "position": {
          "x": -700,
          "y": -180
        },
        "data": {},
        "measured": {
          "width": 934,
          "height": 1037
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "grouper-3",
        "type": "grouper",
        "position": {
          "x": 460,
          "y": 760
        },
        "data": {},
        "measured": {
          "width": 288,
          "height": 228
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-4",
        "type": "viewer",
        "position": {
          "x": 840,
          "y": 500
        },
        "data": {},
        "measured": {
          "width": 934,
          "height": 1037
        },
        "selected": true,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "source-2",
        "sourceHandle": "image",
        "target": "grouper-3",
        "targetHandle": "image-1",
        "id": "xy-edge__source-2image-grouper-3image-1"
      },
      {
        "type": "smoothstep",
        "source": "source-1",
        "sourceHandle": "image",
        "target": "grouper-3",
        "targetHandle": "image-4",
        "id": "xy-edge__source-1image-grouper-3image-4"
      },
      {
        "type": "smoothstep",
        "source": "grouper-3",
        "sourceHandle": "image",
        "target": "viewer-4",
        "targetHandle": "image",
        "id": "xy-edge__grouper-3image-viewer-4image"
      }
    ],
    "id": "pipeline-1788795820778-blraes",
    "name": "2 Entry Points"
  },
  {
    "nodes": [
      {
        "id": "source-5",
        "type": "source",
        "position": {
          "x": -1220,
          "y": 20
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-6",
        "type": "viewer",
        "position": {
          "x": 80,
          "y": 320
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "rescale-7",
        "type": "rescale",
        "position": {
          "x": -220,
          "y": -80
        },
        "data": {},
        "measured": {
          "width": 479,
          "height": 143
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-10",
        "type": "viewer",
        "position": {
          "x": 1040,
          "y": 320
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "source-5",
        "sourceHandle": "image",
        "target": "rescale-7",
        "targetHandle": "image",
        "id": "xy-edge__source-5image-rescale-7image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        }
      }
    ],
    "id": "pipeline-1788795881205-3bm4q9",
    "name": "Sepia & Black&White"
  },
  {
    "nodes": [
      {
        "id": "source-11",
        "type": "source",
        "position": {
          "x": -1460,
          "y": 40
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "rescale-13",
        "type": "rescale",
        "position": {
          "x": -760,
          "y": -160
        },
        "data": {
          "scale": 0.25
        },
        "measured": {
          "width": 475,
          "height": 143
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-15",
        "type": "viewer-single",
        "position": {
          "x": 200,
          "y": 60
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-17",
        "type": "viewer-single",
        "position": {
          "x": -460,
          "y": 380
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-19",
        "type": "viewer-single",
        "position": {
          "x": 860,
          "y": -40
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "source-11",
        "sourceHandle": "image",
        "target": "rescale-13",
        "targetHandle": "image",
        "id": "xy-edge__source-11image-rescale-13image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        }
      }
    ],
    "id": "pipeline-1788796010113-2x2rio",
    "name": "Utilities"
  },
  {
    "nodes": [
      {
        "id": "source-20",
        "type": "source",
        "position": {
          "x": -1640,
          "y": -180
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-22",
        "type": "viewer-single",
        "position": {
          "x": 680,
          "y": -60
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-24",
        "type": "viewer-single",
        "position": {
          "x": 20,
          "y": 160
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-26",
        "type": "viewer-single",
        "position": {
          "x": -620,
          "y": 660
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "split-toning-5",
        "type": "split-toning",
        "position": {
          "x": -2360,
          "y": 1000
        },
        "data": {},
        "measured": {
          "width": 280,
          "height": 188
        }
      },
      {
        "id": "viewer-single-26-copy",
        "type": "viewer-single",
        "position": {
          "x": -2980,
          "y": -340
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-26-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": -2320,
          "y": -340
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-26-copy-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": -2320,
          "y": 600
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-26-copy-copy-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": -2980,
          "y": 600
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [],
    "id": "pipeline-1788796110451-nw5zj8",
    "name": "Colors"
  },
  {
    "nodes": [
      {
        "id": "source-27",
        "type": "source",
        "position": {
          "x": -1180,
          "y": 1100
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-29",
        "type": "viewer-single",
        "position": {
          "x": -220,
          "y": 1500
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-30",
        "type": "viewer-single",
        "position": {
          "x": 440,
          "y": 1500
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-31",
        "type": "viewer-single",
        "position": {
          "x": 1100,
          "y": 1500
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "vignette-32",
        "type": "vignette",
        "position": {
          "x": 440,
          "y": 1100
        },
        "data": {
          "amount": 81
        },
        "measured": {
          "width": 280,
          "height": 145
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-1",
        "type": "viewer-single",
        "position": {
          "x": -1840,
          "y": 880
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "photo-histogram-3",
        "type": "photo-histogram",
        "position": {
          "x": -600,
          "y": 620
        },
        "data": {},
        "measured": {
          "width": 430,
          "height": 293
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "photo-histogram-4",
        "type": "photo-histogram",
        "position": {
          "x": 1520,
          "y": 1180
        },
        "data": {},
        "measured": {
          "width": 430,
          "height": 293
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "split-toning-2",
        "type": "split-toning",
        "position": {
          "x": -720,
          "y": -60
        },
        "data": {
          "strength": 100
        },
        "measured": {
          "width": 280,
          "height": 188
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-1-copy",
        "type": "viewer-single",
        "position": {
          "x": 320,
          "y": -480
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-1-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": -360,
          "y": -460
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-1-copy-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": 980,
          "y": -500
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "rescale-8",
        "type": "rescale",
        "position": {
          "x": -1140,
          "y": 900
        },
        "data": {},
        "measured": {
          "width": 479,
          "height": 143
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-1-copy-2",
        "type": "viewer-single",
        "position": {
          "x": -1840,
          "y": 160
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-1-copy-2-copy",
        "type": "viewer-single",
        "position": {
          "x": -1500,
          "y": -580
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "vignette-9",
        "type": "vignette",
        "position": {
          "x": -2520,
          "y": -500
        },
        "data": {
          "amount": 100
        },
        "measured": {
          "width": 280,
          "height": 145
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-12",
        "type": "viewer-single",
        "position": {
          "x": -2500,
          "y": 1420
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-12-copy",
        "type": "viewer-single",
        "position": {
          "x": -2500,
          "y": 560
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-12-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": -2520,
          "y": -320
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "information-13",
        "type": "information",
        "position": {
          "x": -1580,
          "y": 1580
        },
        "data": {
          "content": "Start here !"
        },
        "measured": {
          "width": 380,
          "height": 277
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "vignette-32",
        "sourceHandle": "image",
        "target": "viewer-single-30",
        "targetHandle": "image",
        "id": "xy-edge__vignette-32image-viewer-single-30image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        }
      },
      {
        "type": "smoothstep",
        "source": "split-toning-2",
        "sourceHandle": "image",
        "target": "viewer-single-1-copy-copy",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__split-toning-2image-viewer-single-1-copy-copyimage"
      },
      {
        "type": "smoothstep",
        "source": "source-27",
        "sourceHandle": "image",
        "target": "rescale-8",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-27image-rescale-8image"
      },
      {
        "type": "smoothstep",
        "source": "rescale-8",
        "sourceHandle": "image",
        "target": "viewer-single-1",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__rescale-8image-viewer-single-1image"
      },
      {
        "type": "smoothstep",
        "source": "rescale-8",
        "sourceHandle": "image",
        "target": "photo-histogram-3",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__rescale-8image-photo-histogram-3image"
      },
      {
        "type": "smoothstep",
        "source": "rescale-8",
        "sourceHandle": "image",
        "target": "vignette-32",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__rescale-8image-vignette-32image"
      },
      {
        "type": "smoothstep",
        "source": "rescale-8",
        "sourceHandle": "image",
        "target": "split-toning-2",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__rescale-8image-split-toning-2image"
      },
      {
        "type": "smoothstep",
        "source": "rescale-8",
        "sourceHandle": "image",
        "target": "vignette-9",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__rescale-8image-vignette-9image"
      },
      {
        "type": "smoothstep",
        "source": "vignette-9",
        "sourceHandle": "image",
        "target": "viewer-single-12-copy-copy",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__vignette-9image-viewer-single-12-copy-copyimage"
      }
    ],
    "id": "pipeline-1788796202862-7id76m",
    "name": "Decorative"
  },
  {
    "nodes": [
      {
        "id": "source-1",
        "type": "source",
        "position": {
          "x": 300,
          "y": 600
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "grouper-8",
        "type": "grouper",
        "position": {
          "x": 940,
          "y": 340
        },
        "data": {},
        "measured": {
          "width": 283,
          "height": 236
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "rescale-10",
        "type": "rescale",
        "position": {
          "x": 1260,
          "y": 480
        },
        "data": {},
        "measured": {
          "width": 479,
          "height": 143
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "ai-colorizer-11",
        "type": "ai-colorizer",
        "position": {
          "x": 1260,
          "y": 640
        },
        "data": {
          "passthru": true
        },
        "measured": {
          "width": 280,
          "height": 104
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "ai-denoiser-12",
        "type": "ai-denoiser",
        "position": {
          "x": 0,
          "y": 740
        },
        "data": {
          "passthru": true
        },
        "measured": {
          "width": 280,
          "height": 104
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "lut-16",
        "type": "lut",
        "position": {
          "x": 1260,
          "y": 760
        },
        "data": {},
        "measured": {
          "width": 280,
          "height": 148
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "vignette-27",
        "type": "vignette",
        "position": {
          "x": 1260,
          "y": 920
        },
        "data": {},
        "measured": {
          "width": 280,
          "height": 145
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "photo-histogram-32",
        "type": "photo-histogram",
        "position": {
          "x": 480,
          "y": 280
        },
        "data": {},
        "measured": {
          "width": 430,
          "height": 293
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "hot-folder-read-5",
        "type": "hot-folder-read",
        "position": {
          "x": 160,
          "y": 420
        },
        "data": {},
        "measured": {
          "width": 300,
          "height": 163
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "information-6",
        "type": "information",
        "position": {
          "x": -240,
          "y": 300
        },
        "data": {
          "content": "Hello to Couch Editor"
        },
        "measured": {
          "width": 380,
          "height": 277
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "selected-photo-7",
        "type": "selected-photo",
        "position": {
          "x": 1260,
          "y": 360
        },
        "data": {},
        "measured": {
          "width": 280,
          "height": 92
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "hot-folder-write-8",
        "type": "hot-folder-write",
        "position": {
          "x": 160,
          "y": 240
        },
        "data": {},
        "measured": {
          "width": 297,
          "height": 163
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "split-toning-5",
        "type": "split-toning",
        "position": {
          "x": -300,
          "y": 1500
        },
        "data": {},
        "measured": {
          "width": 280,
          "height": 188
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [],
    "id": "pipeline-1788796499557-424bey",
    "name": "Demo"
  },
  {
    "nodes": [
      {
        "id": "source-1",
        "type": "source",
        "position": {
          "x": -580,
          "y": 440
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1044
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "rescale-13",
        "type": "rescale",
        "position": {
          "x": -60,
          "y": 280
        },
        "data": {
          "scale": 0.5
        },
        "measured": {
          "width": 475,
          "height": 143
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "split-toning-22",
        "type": "split-toning",
        "position": {
          "x": 1060,
          "y": 1500
        },
        "data": {},
        "measured": {
          "width": 280,
          "height": 188
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-23-copy",
        "type": "viewer-single",
        "position": {
          "x": 1400,
          "y": 380
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "selected-photo-1",
        "type": "selected-photo",
        "position": {
          "x": -100,
          "y": 160
        },
        "data": {},
        "measured": {
          "width": 280,
          "height": 92
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "split-toning-22",
        "sourceHandle": "image",
        "target": "viewer-single-23-copy",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__split-toning-22image-viewer-single-23-copyimage"
      },
      {
        "type": "smoothstep",
        "source": "source-1",
        "sourceHandle": "image",
        "target": "selected-photo-1",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-1image-selected-photo-1image"
      },
      {
        "type": "smoothstep",
        "source": "selected-photo-1",
        "sourceHandle": "image",
        "target": "rescale-13",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__selected-photo-1image-rescale-13image"
      }
    ],
    "id": "pipeline-1789043070838-5dq8f2",
    "name": "StressTest"
  },
  {
    "nodes": [
      {
        "id": "source-1",
        "type": "source",
        "position": {
          "x": -1280,
          "y": -220
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1044
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-2",
        "type": "viewer",
        "position": {
          "x": 480,
          "y": -140
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1044
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "rescale-6",
        "type": "rescale",
        "position": {
          "x": -320,
          "y": -400
        },
        "data": {
          "scale": 0.5
        },
        "measured": {
          "width": 476,
          "height": 143
        },
        "selected": true,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "source-1",
        "sourceHandle": "image",
        "target": "rescale-6",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-1image-rescale-6image"
      }
    ],
    "id": "pipeline-1789333682672-m5bubo",
    "name": "Brightness"
  },
  {
    "nodes": [
      {
        "id": "source-6",
        "type": "source",
        "position": {
          "x": -1660,
          "y": -620
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": true,
        "dragging": false
      },
      {
        "id": "rescale-8",
        "type": "rescale",
        "position": {
          "x": 760,
          "y": -280
        },
        "data": {
          "scale": 0.1
        },
        "measured": {
          "width": 475,
          "height": 143
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "collage-9",
        "type": "collage",
        "position": {
          "x": 760,
          "y": 580
        },
        "data": {
          "columns": 5
        },
        "measured": {
          "width": 490,
          "height": 196
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14",
        "type": "viewer-single",
        "position": {
          "x": 1420,
          "y": -120
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy",
        "type": "viewer-single",
        "position": {
          "x": 760,
          "y": -120
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": 1720,
          "y": 800
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-2",
        "type": "viewer-single",
        "position": {
          "x": 80,
          "y": -120
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": 80,
          "y": 800
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-15",
        "type": "viewer",
        "position": {
          "x": 760,
          "y": 800
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-2-copy",
        "type": "viewer-single",
        "position": {
          "x": -640,
          "y": -120
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "rescale-8",
        "sourceHandle": "image",
        "target": "viewer-single-14-copy",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__rescale-8image-viewer-single-14-copyimage"
      },
      {
        "type": "smoothstep",
        "source": "source-6",
        "sourceHandle": "image",
        "target": "rescale-8",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-6image-rescale-8image"
      },
      {
        "type": "smoothstep",
        "source": "source-6",
        "sourceHandle": "image",
        "target": "collage-9",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-6image-collage-9image"
      },
      {
        "type": "smoothstep",
        "source": "collage-9",
        "sourceHandle": "image",
        "target": "viewer-15",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__collage-9image-viewer-15image"
      }
    ],
    "id": "pipeline-1789337461709-gf4bcm",
    "name": "Transform"
  },
  {
    "nodes": [
      {
        "id": "source-6-reset",
        "type": "source",
        "position": {
          "x": -1780,
          "y": 80
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14",
        "type": "viewer-single",
        "position": {
          "x": 1400,
          "y": -500
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy",
        "type": "viewer-single",
        "position": {
          "x": 720,
          "y": -500
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": -640,
          "y": 400
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-2",
        "type": "viewer-single",
        "position": {
          "x": 40,
          "y": -500
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": 40,
          "y": 400
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-2-copy",
        "type": "viewer-single",
        "position": {
          "x": -640,
          "y": -500
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-copy",
        "type": "viewer-single",
        "position": {
          "x": 720,
          "y": 400
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-copy-copy-2",
        "type": "viewer-single",
        "position": {
          "x": 1400,
          "y": 400
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "grouper-14",
        "type": "grouper",
        "position": {
          "x": -1220,
          "y": -620
        },
        "data": {},
        "measured": {
          "width": 283,
          "height": 236
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-copy-2",
        "type": "viewer-single",
        "position": {
          "x": -640,
          "y": 1320
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-copy-2-copy",
        "type": "viewer-single",
        "position": {
          "x": 40,
          "y": 1320
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-14-copy-copy-copy-copy-3",
        "type": "viewer-single",
        "position": {
          "x": 720,
          "y": 1320
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "selected-photo-15",
        "type": "selected-photo",
        "position": {
          "x": -1240,
          "y": -240
        },
        "data": {
          "selectedPhotoName": "20260124_131017.jpg"
        },
        "measured": {
          "width": 280,
          "height": 92
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "selected-photo-15",
        "sourceHandle": "image",
        "target": "grouper-14",
        "targetHandle": "image-1",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__selected-photo-15image-grouper-14image-1"
      },
      {
        "type": "smoothstep",
        "source": "source-6-reset",
        "sourceHandle": "image",
        "target": "selected-photo-15",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-6image-selected-photo-15image"
      }
    ],
    "id": "pipeline-1789337933916-dyplp5",
    "name": "Light"
  },
  {
    "nodes": [
      {
        "id": "source-16-reset",
        "type": "source",
        "position": {
          "x": -2280,
          "y": 300
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "hot-folder-read-17",
        "type": "hot-folder-read",
        "position": {
          "x": -1640,
          "y": 80
        },
        "data": {},
        "measured": {
          "width": 300,
          "height": 163
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "google-drive-18",
        "type": "google-drive",
        "position": {
          "x": -1320,
          "y": 420
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1080
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-19",
        "type": "viewer",
        "position": {
          "x": -360,
          "y": 180
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "grouper-20",
        "type": "grouper",
        "position": {
          "x": -780,
          "y": 160
        },
        "data": {},
        "measured": {
          "width": 283,
          "height": 236
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "grouper-20",
        "sourceHandle": "image",
        "target": "viewer-19",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__grouper-20image-viewer-19image"
      },
      {
        "type": "smoothstep",
        "source": "hot-folder-read-17",
        "sourceHandle": "image",
        "target": "grouper-20",
        "targetHandle": "image-1",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__hot-folder-read-17image-grouper-20image-1"
      },
      {
        "type": "smoothstep",
        "source": "source-16-reset",
        "sourceHandle": "image",
        "target": "grouper-20",
        "targetHandle": "image-2",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-16-resetimage-grouper-20image-2"
      },
      {
        "type": "smoothstep",
        "source": "google-drive-18",
        "sourceHandle": "image",
        "target": "grouper-20",
        "targetHandle": "image-3",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__google-drive-18image-grouper-20image-3"
      }
    ],
    "id": "pipeline-1789338428659-f8fd3w",
    "name": "Inputs"
  },
  {
    "nodes": [
      {
        "id": "source-21-reset",
        "type": "source",
        "position": {
          "x": -1800,
          "y": 440
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-22",
        "type": "viewer",
        "position": {
          "x": 380,
          "y": 440
        },
        "data": {},
        "measured": {
          "width": 930,
          "height": 1045
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "viewer-single-23",
        "type": "viewer-single",
        "position": {
          "x": -280,
          "y": 440
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "exif-viewer-24",
        "type": "exif-viewer",
        "position": {
          "x": -280,
          "y": 1140
        },
        "data": {},
        "measured": {
          "width": 630,
          "height": 673
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "gps-map-25",
        "type": "gps-map",
        "position": {
          "x": -840,
          "y": 440
        },
        "data": {},
        "measured": {
          "width": 530,
          "height": 617
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "photo-histogram-26",
        "type": "photo-histogram",
        "position": {
          "x": -760,
          "y": 1120
        },
        "data": {},
        "measured": {
          "width": 430,
          "height": 293
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "hot-folder-write-27",
        "type": "hot-folder-write",
        "position": {
          "x": -840,
          "y": 180
        },
        "data": {},
        "measured": {
          "width": 297,
          "height": 163
        },
        "selected": true,
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "smoothstep",
        "source": "source-21-reset",
        "sourceHandle": "image",
        "target": "viewer-22",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-21image-viewer-22image"
      },
      {
        "type": "smoothstep",
        "source": "source-21-reset",
        "sourceHandle": "image",
        "target": "viewer-single-23",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-21image-viewer-single-23image"
      },
      {
        "type": "smoothstep",
        "source": "source-21-reset",
        "sourceHandle": "image",
        "target": "exif-viewer-24",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-21image-exif-viewer-24image"
      },
      {
        "type": "smoothstep",
        "source": "source-21-reset",
        "sourceHandle": "image",
        "target": "photo-histogram-26",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-21image-photo-histogram-26image"
      },
      {
        "type": "smoothstep",
        "source": "source-21-reset",
        "sourceHandle": "image",
        "target": "gps-map-25",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-21image-gps-map-25image"
      },
      {
        "type": "smoothstep",
        "source": "source-21-reset",
        "sourceHandle": "image",
        "target": "hot-folder-write-27",
        "targetHandle": "image",
        "style": {
          "strokeWidth": 2,
          "stroke": "rgba(113, 82, 248, 0.6)"
        },
        "id": "xy-edge__source-21-resetimage-hot-folder-write-27image"
      }
    ],
    "id": "pipeline-1789338530777-eb4f2k",
    "name": "Outputs"
  }
];
