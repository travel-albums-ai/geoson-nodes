import passportIndex from './passport-index.json'  with { type: 'json' };
import customGeo from './custom.geo.json' with { type: 'json' };

const result = {
    type: "FeatureCollection",
    features: customGeo.features
    // .filter((_, index) => index < 10) // Example filter, keep every second feature
    .map(v => ({
        properties: {
            iso_a2: v.properties.iso_a2_eh,
            name: v.properties.name_en,
            visas: Object.entries(passportIndex[v.properties.iso_a2_eh] || {}).map(([key, value]) => ({ key: customGeo.features.find(f => f.properties.iso_a2_eh === key)?.properties.name_en || key, ...value })),
        },
        type: "Feature",
    }))
    // .filter(f => f.properties.name === "Norway")
};

// console.log(customGeo.features.filter(f => f.properties.name_en === "Norway"));
console.log(JSON.stringify(result, null, 4));

// write file
import fs from 'fs';
fs.writeFileSync('passport-index-formatted.geojson', JSON.stringify(result, null, 4));
