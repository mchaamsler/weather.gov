document.addEventListener("DOMContentLoaded", () => {
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute(
    "src",
    "https://radar.weather.gov/cmi-radar/cmi-radar.1185c3ee.js",
  );

  const point = [-86.7744, 36.1622];

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
          center: point,
          location: point,
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
    window.app.$store.dispatch("markLocation", point);

    document.querySelector(".cmi-radar-menu").remove();
  });

  document.body.appendChild(script);
});
