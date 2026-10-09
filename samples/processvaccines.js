import vaccines from './vaccines2.json'  with { type: 'json' };
import customGeo from './custom.geo.json' with { type: 'json' };

const result = {
    type: "FeatureCollection",
    features: customGeo.features
    // .filter((_, index) => index < 10) // Example filter, keep every second feature
    .map(v => ({
        properties: {
            iso_a2: v.properties.iso_a2,
            name: v.properties.name_en,
            vaccines: vaccines.data.find(d => d.country === v.properties.name_en)?.vaccines || [],
        },
        type: "Feature",
    }))
};
console.log(JSON.stringify(result, null, 4));

// write file
import fs from 'fs';
fs.writeFileSync('vaccines-processed.geojson', JSON.stringify(result, null, 4));
