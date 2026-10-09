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
    "edges": [],
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
    "edges": [],
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
      }
    ],
    "edges": [],
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
      }
    ],
    "edges": [],
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
      }
    ],
    "edges": [],
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
    "edges": [],
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
      }
    ],
    "edges": [],
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
