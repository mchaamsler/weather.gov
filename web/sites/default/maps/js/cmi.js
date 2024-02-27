document.addEventListener("DOMContentLoaded", () => {
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute(
    "src",
    "https://radar.weather.gov/cmi-radar/cmi-radar.1185c3ee.js",
  );

  const point = [36.1622, -86.7744];

  script.addEventListener("load", () => {
    const options = {
      settings: {
        menu: {
          open: true,
        },
        map: {
          base: "standard",
          overlays: {
            artcc: false,
            county: false,
            cwa: false,
            rfc: false,
            state: false,
          },
          animating: false,
          zoom: 9,
          center: [point[1], point[0]],
          location: null,
        },
        agenda: null,
        layers: {
          alerts: {
            filter: "hazards",
            opacity: 0.8,
          },
          local: {
            opacity: 0.6,
          },
          stations: {
            opacity: 0.8,
          },
          national: {
            opacity: 0.6,
          },
        },
      },
      urls: {
        alerts: "https://alerts-v2.weather.gov",
        api: "https://api.weather.gov",
        forecast: "https://forecast.weather.gov",
        gis: "https://opengeo.ncep.noaa.gov/geoserver",
      },
    };

    window.app = window.cmiRadar.createApp(
      "#weathergov_location_radar",
      options,
    );
  });

  document.body.appendChild(script);
});
