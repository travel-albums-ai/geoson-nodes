# CouchEditor

![CouchEditor](https://img.shields.io/badge/CouchEditor-Visual%20photo%20editing-ff6b6b?style=for-the-badge)
![Pipelines](https://img.shields.io/badge/Pipelines-Drag%20%26%20drop-4ecdc4?style=for-the-badge)
![Format](https://img.shields.io/badge/Recipes-.cep-45b7d1?style=for-the-badge)

> Build reusable photo-editing recipes by arranging steps on a visual canvas.

CouchEditor lets you select photos, connect editing steps, preview the result, and save the workflow as a reusable `.cep` pipeline. The pipeline describes the edits; it does not alter your original files.

![CouchEditor workspace](./screenshots/couch-editor.png)

## 📸 What can I do with CouchEditor?

- Choose JPEG, PNG, or WebP photos from your computer.
- Arrange logic steps and optional AI steps.
- Preview one photo or a complete set of photos.
- Inspect GPS information where those outputs are useful.
- Download processed photos from a viewer or write them to a configured folder.
- Save a recipe in the browser, then export or import it as a `.cep` file.

## 🧩 How it works

A pipeline is a set of connected steps:

1. An **input** step provides photos or supporting information.
2. **Logic**, transform, and editing steps process or route that information.
3. An **output** step previews, inspects, or writes the result.

A typical pipeline looks like this:

`Photos -> Viewer`

The safest way to begin is to connect a photo input directly to a viewer. Once the photos appear, add one editing step at a time and check the result after each change.

## 🚀 Getting started

1. Open CouchEditor.
2. Open the toolbox on the left if it is hidden.
3. Drag a photo input onto the canvas.
4. Select the photos you want to edit.
5. Drag a logic or AI step onto the canvas, if you need one.
6. Drag a viewer onto the canvas.
7. Connect steps by dragging from an output connector to the next input connector.
8. Adjust the step controls and review the result in the viewer.

The toolbox includes a search field and supports dragging nodes onto the canvas. AI nodes are shown when AI features are enabled.

![CouchEditor toolbox](./screenshots/couch-editor-toolbox.png)

### Choosing photos

Use the local photo input to select images from your computer. The selected photo count and thumbnails are shown on the node. Other input nodes can provide a hot folder when that integration fits your setup.

### Connecting and changing steps

Connect steps in the order you want them applied. To change a connection, drag its endpoint to another connector. To remove a connection, double-click it. To remove a node, drag it to the trash area or select it and press `Delete`.

## 🧰 Available toolkit

The toolbox groups nodes by purpose. Exact labels can vary with the active language and enabled features.

- **Input**: local storage, hot-folder input, GeoJSON file input, and Flight Path (a list of flights, each with a "From airport" and "To airport"; load them from a JSON file with "Load flights file", or add and edit them by hand. The airport pickers search a bundled list of about 9,000 airports by IATA code, city, or name. The file format is `{"flights": [{"from": "WAW", "to": "JFK"}]}` using IATA codes; flights with unknown codes are skipped and listed on the node. Loading a file replaces the current list. Each flight can also carry a `price`, `currency`, `date` (YYYY-MM-DD), and `extraText`, which are read from the file and passed on to the output. An example is in [samples/flights-sample.json](./samples/flights-sample.json). The node outputs a GeoJSON collection with a gently curved line for each flight, carrying those price, currency, date, and extra text values as properties, along with a `distanceKm` property holding the great-circle distance between the airports, calculated when the node runs (it is not stored in the file), and a tooltip that shows the route, the distance in km, then the price, date, and extra text, plus a point for each airport, which can be plotted on the GPS map. Flights with a missing airport or the same airport at both ends are skipped. Airport data comes from [OurAirports](https://ourairports.com/data/), which is in the public domain). URL GeoJSON Loader (fetches a GeoJSON feed from a URL and outputs it as a GeoJSON feature collection array, one collection per response. Choose one of five example feeds from the dropdown: NASA EONET natural events for the last 30 days, USGS earthquakes for the past hour, USGS significant earthquakes for the past week, USGS magnitude 4.5+ earthquakes for the past day, and GDELT news locations for the last 15 minutes (`https://api.gdeltproject.org/api/v1/gkg_geojson?TIMESPAN=15`). Type any http or https URL in the text field and press Add (or Enter) to add it to the dropdown and select it. The browser must be allowed to read the feed (CORS); nothing is fetched automatically: press the node's Fetch button to download the selected feed, which is stored in the browser's IndexedDB until you fetch again. An error is shown on the node and leaves the previous result in place. A GDELT error response is reported the same way). GDELT Events Loader (downloads one daily GDELT events export from the list, `GDELT.MASTERREDUCEDV2.1979-2013` excluded because it is about 1.1 GB, from the newest of the 19 daily files from 2026-09-22 to 2026-10-10 by default. Press Load and the browser downloads the zip, unzips it, and reads its tab-separated events file. The node outputs a GeoJSON collection with one point per event at its action location, skipping events without coordinates, with GDELT fields such as event code, Goldstein scale, tone, mentions, and source URL as properties, and `name` set to the location name. The full file is stored in the browser's IndexedDB until you load again). QLever OSM Query (runs a SPARQL query, which you type or paste into the node, against the [QLever OSM planet](https://qlever.dev/osm-planet) endpoint when you press Run. The default query looks up museums in OpenStreetMap with their names and WKT geometries. The node reads each result row and outputs a GeoJSON collection with one feature per row that has a `geo:wktLiteral` value, parsing POINT, LINESTRING, POLYGON, MULTI* and GEOMETRYCOLLECTION geometries, with the other selected variables as properties. Rows without a geometry are skipped, and a query whose rows have no WKT geometry is reported as an error. QLever has no GeoJSON output format, so the conversion happens in the browser. An "Ask ChatGPT" button opens ChatGPT in a new tab with the current query in a `?prompt=` link, so you can ask for help writing or fixing it. The link is a plain URL, so very long queries may be cut short. Queries can take a while on the full planet, and the result is stored in the browser's IndexedDB until you run again). Open-Meteo Weather (draw a bounding box on the map, defaulting to Berlin and its surroundings, and set a grid step, defaulting to 0.25° and at least 0.01°, to fetch the current weather from [Open-Meteo](https://open-meteo.com/) at every grid point inside the box. The points sit on multiples of the step, the south and west edges are included, and the north and east edges are not. The point count updates as you move the box or change the step, and it is capped at 1000 points, which are sent in batches of 250. Press Load to fetch it. The node outputs one GeoJSON point per grid point, with the time in each point's local timezone and the values you choose under Show as properties: temperature (°C), rain (mm), apparent temperature (°C), and weather code (WMO). The values come from the nearest Open-Meteo model cell. Moving the box or changing the step does not fetch again until you press Load. Changing the Show selection does not fetch again either, since all values are downloaded on Load and filtered when the pipeline runs; at least one value must stay selected. The result is stored in the browser's IndexedDB until you load again). FIT Input (loads one or more Garmin `.fit` activity files, such as Garmin or Zepp watch exports, chosen with the Select FIT files button; choosing files again replaces the previous selection. Each file is decoded with Garmin's official FIT SDK, and a file that is not valid FIT is reported on the node without replacing the current files. The node outputs one GeoJSON collection per file, named after the file, with the GPS track as a line carrying the sport, start time, distance, duration, ascent, descent, calories, and heart rate as properties, plus a point for the start and one for the finish. A file without GPS positions gives a collection with no features. The files are stored in the browser's IndexedDB until you select again).
- **Logic**: grouping, array switching and boolean operations, and GPS splitting.
- **Filter**: GPS bounds filter (keeps GeoJSON features with a position inside a rectangle you set by dragging two vertical and two horizontal lines on a world map). GeoJSON within area (takes two inputs, A and B, and keeps the features from B that lie entirely inside the combined area of the features in A; points are tested directly, so connecting a list of countries to A and a list of UNESCO sites to B returns only the sites inside those countries; a "Keep outside the area" switch returns the rest instead, which subtracts the area from B). GeoJSON feature picker (takes one GeoJSON input and a slider from the first to the last feature; outputs only the feature at the chosen position as a single item, keeping the input's collection details). Flight routes (takes multiple GeoJSON inputs, such as flight routes, a departure and arrival airport, and optional stops the route may pass through; finds every route over one-way flights that visits each airport at most once and only uses the start, end, and stop airports, listing the cheapest first (a depth-first branch-and-bound search that keeps only the cheapest routes in memory, so a long search takes more time rather than more RAM; routes with an unpriced or mixed-currency flight come after the fully priced ones); the same start and end airport gives a round trip through a stop; the output is one GeoJSON feature per route, named with its chained airports such as `BER > FRA > BER`, with each flight as a leg (price, currency, date, extra text) and a `totalPrice` set when every leg has a price in the same currency; the search stops after 1000 routes or 5 million steps).
- **Utility**: post-it note (a free-form sticky note for comments; its text shrinks as you type more, and it is not part of the data flow), GeoJSON merge (concatenates the GeoJSON collections from up to four inputs into one list; its chips show how many features enter each input and how many leave in total), GeoJSON style (sets the fill color, stroke color, stroke width and opacity of every feature in its input; each color is either a palette color or a color generated from a property of the feature (mixed 80/20 with a base color you pick, the generated part coming from the property value picked from a dropdown of the input's property keys); the GPS map and GeoJSON viewer draw the features with that style, and the opacity applies to both fill and stroke), GeoJSON heatmap (turns the points, lines and polygons of every input into a smooth density heatmap drawn as colored bands from blue to red; a granularity slider sets the resolution of the density grid, so higher values give more detailed edges but take longer to compute, a smoothing slider sets how far each feature's weight spreads, so higher values give broader, softer areas, a complexity slider sets the number of color bands, and an intensity dropdown picks a numeric property whose value sets how strongly each feature contributes, listing only the properties whose values are all numeric), GeoJSON zip (takes two inputs, A with the full data and B with partial data; joins each A feature with the B feature that has the same value for a chosen key, `name` or `name_en` or any other key both inputs share, picked from a dropdown; A's geometry and values are kept, and B adds only the properties A lacks), GeoJSON switch (takes two inputs, A and B, and passes one of them on: A by default, or B when the "Serve B" switch is on), set operations between two GeoJSON inputs (union, intersection, difference, and symmetric difference; features match when their full content is the same, and duplicates are removed; a "Swap A and B" switch exchanges the two inputs, so difference becomes B minus A), and JSONata query (runs a JSONata expression over the list of collections, re-running as you type; a "Negate" switch passes on the features the expression leaves out instead of the ones it selects).
- **AI**: AI photo editing and Ask AI when AI is enabled and configured.
- **Output**: single-photo and multi-photo viewers, GPS map (plots GeoJSON features), GeoJSON viewer (plots GeoJSON features and lists each collection), GeoJSON first feature (shows the properties of the first feature in a read-only text box; it has no output), and hot-folder output.

## 🔄 Common usage flows

### ⚡ Quick edit

Use this for a one-off adjustment:

`Local photos -> Transform or adjustment -> Single-photo viewer`

Connect a multi-photo viewer as well when you need to check the whole set before downloading it.

### 💾 Repeatable recipe

Use this when the same look or export process will be reused:

1. Build and test the pipeline.
2. Enter a descriptive pipeline title.
3. Select **Save** to store it in CouchEditor.
4. Use **Save as clone** before experimenting with a variation.
5. Use **Download pipeline** to export the recipe as a `.cep` file.
6. Use **Upload pipeline** to import the recipe on another browser or computer.
7. Select photos in the imported pipeline before running it.

The `.cep` file contains the recipe, not the original photos. Anyone importing it must provide their own source photos.

![CouchEditor templates](./screenshots/couch-editor-templates.png)

### 🔍 Inspect and understand a photo

Connect a source to the output that matches the question you are asking:

- Use a single-photo viewer to compare one result.
- Use a multi-photo viewer to review a complete set and download results together.
- Use the GPS map to plot GeoJSON features from a GeoJSON Input node (for example, the sample file in `samples/sample-feature-collections.geojson`).
- Place a GPS bounds filter between a GeoJSON Input node and a GPS map or GeoJSON viewer to keep only the features inside the area you drag out on its map.

### 🤖 Optional AI editing

Enable AI features in the relevant settings and configure the required provider or key before adding AI nodes. AI availability depends on the installation and configuration. The AI onboarding screen shows the available setup state.

![CouchEditor AI settings](./screenshots/couch-editor-settings-onboarding-ai.png)

## 💾 Saving and sharing

Saved pipelines live in the browser where they were created. Clearing browser storage or switching browsers can remove access to them, so export important recipes as `.cep` files.

Files loaded into **GeoJSON Input** and **FIT Input** nodes are stored in the browser's IndexedDB, so they are still there after a reload.

- **New** clears the current canvas for another recipe.
- **Save** stores the current recipe.
- **Save as clone** creates a separate copy while keeping the original.
- The pipeline selector loads a saved recipe.
- The trash action removes the selected saved recipe.
- **Download pipeline** exports the current recipe.
- **Upload pipeline** imports a `.cep` recipe.

The **Starter Templates** group in the templates window lists every `.cep` file in `src/samples/`, found at build time. Starters are read-only: opening one loads it, and saving it creates your own copy. Starters cannot be deleted.

## ⚙️ Settings, themes, and help

Settings contain application configuration and available personalization options. The built-in help view is useful when a control or workflow is unclear.

![CouchEditor settings](./screenshots/couch-editor-settings.png)

![CouchEditor themes](./screenshots/couch-editor-settings-onboarding-themes.png)

![CouchEditor help](./screenshots/couch-editor-help.png)

## 💡 Tips

- Start with a viewer connected directly to the photo input, then insert edits between them.
- Keep one pipeline focused on one look or task.
- Use names such as `Warm family photos` or `Web-size exports` for saved recipes.
- Save before a large experiment, or clone the recipe first.
- Export recipes that need to survive browser storage cleanup or be shared with someone else.

## 🛠️ For developers

CouchEditor is a Vite and React application.

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build    # Create a production build
npm run preview  # Build and serve a production preview
npm run lint     # Check the source code
```

The screenshot refresh command used by maintainers is:

```bash
npm run snaphot
```

## 🤝 Looking for collaborators

I am looking for collaborators, founders, and volunteers who are interested in building better tools for photo editing and creative workflows. Contributions can include product ideas, design, development, documentation, testing, or feedback.

If CouchEditor sounds interesting, open an issue or pull request to introduce yourself and share how you would like to help.

## 📄 License

See [LICENSE](LICENSE) for licensing information.



Build with love using Vite and React.
