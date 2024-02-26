import * as leaflet from "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js";

const loadLeafletRadar = () => {
  const point = [36.1622, -86.7744];

  return;

  const map = leaflet
    .map("weathergov_location_radar")
    .setView([36.1622, -86.7744], 9);

  // Leaflet is managed by a Ukrainian team. The default attribution they put on
  // maps includes a Ukrainian flag to show their national pride. But as an
  // official website of the US Government, that might not be appropriate for
  // us, so turn off the attribution. We're not likely to use Leaflet in the
  // end anyway, but if we do, we'll figure out how to put back attributions
  // without the flag then.
  map.attributionControl.setPrefix("");

  leaflet
    .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(map);

  const locationIcon = leaflet.divIcon({
    className: "weathergov-location-marker",
  });
  leaflet.marker(point, { icon: locationIcon }).addTo(map);

  fetch(
    "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=wms&version=1.1.1&request=GetCapabilities",
  )
    .then((response) => response.text())
    .then((capabilities) => {
      const timeExtents = /<Extent [^>]*name="time"[^>]*>([^<]+)</
        .exec(capabilities)[1]
        .split(",")
        .slice(-30);

      const layers = timeExtents.map((time) => {
        const paneName = `radar-${time.replace(/[:.]/g, "-")}`;
        const pane = map.createPane(paneName);

        const layer = leaflet.tileLayer.wms(
          "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows",
          {
            time,
            layers: "conus_bref_qcd",
            transparent: true,
            format: "image/png",
            opacity: 0.55,
            pane: paneName,
          },
        );
        layer.addTo(map);

        pane.setAttribute("style", "opacity: 0;");
        pane.setAttribute("data-timestamp", time);

        return pane;
      });

      let layer = layers[layers.length - 1];

      const timestampFormatter = new Intl.DateTimeFormat(navigator.language, {
        hour: "numeric",
        minute: "numeric",
      });
      const timestampElement = document.querySelector(
        "#weathergov_location_radar_timestamp",
      );

      let index = 0;
      const nextImage = () => {
        layer.setAttribute("style", "opacity: 0;");
        layer = layers[index];
        layer.setAttribute("style", "opacity: 1;");

        const timestamp = layer.getAttribute("data-timestamp");
        timestampElement.innerText = timestampFormatter.format(
          new Date(Date.parse(timestamp)),
        );

        index = (index + 1) % layers.length;
        // return;

        if (index === 0) {
          setTimeout(nextImage, 3_000);
        } else {
          setTimeout(nextImage, 500);
        }
      };
      nextImage();

      leaflet.tileLayer
        .wms("https://opengeo.ncep.noaa.gov/geoserver/wwa/hazards/ows", {
          layers: "hazards",
          transparent: true,
          format: "image/png",
          opacity: 0.7,
        })
        .addTo(map);

      leaflet.tileLayer
        .wms("https://opengeo.ncep.noaa.gov/geoserver/wwa/warnings/ows", {
          layers: "hazards",
          transparent: true,
          format: "image/png",
          opacity: 0.7,
        })
        .addTo(map);
    });
};

document.addEventListener("DOMContentLoaded", () => {
  loadLeafletRadar();
});
