import fs from "node:fs/promises";
import express from "express";
import path from "node:path";
import proxyToApi from "./proxy.js";
import config from "./config.js";
import serveBundle from "./serve.js";

const app = express();
const port = process.env.PORT ?? 8081;

const fsExists = async (filePath) =>
  fs
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

const ui = async (error = false) => {
  const lines = ["<html>"];

  if (error) {
    lines.push(`<h2>${error}</h2>`);
  }

  if (config.bundling) {
    lines.push("Currently recording new bundles");
    lines.push(`<br><a href="/stop">Stop recording</a>`);
    lines.push("<br><br>");
  } else if (config.play) {
    lines.push(`Currently playing bundle <strong>${config.play}</strong>`);
    lines.push(`<br><a href="/stop">Stop playing</a>`);
    lines.push("<br><br>");
  } else {
    lines.push(`Not playing a bundle. Sending requests through.`);
    lines.push("<br><br>");
  }

  const contents = await fs
    .readdir("./data")
    .then((files) => files.filter((file) => !file.startsWith(".")));

  const dirs = await Promise.all(
    contents.map(async (file) => {
      const stat = await fs.stat(path.join("./data", file));
      return stat.isDirectory();
    }),
  );

  const bundles = contents.filter((_, i) => dirs[i]);

  lines.push("Available bundles:");
  lines.push(
    `<ul><li>${bundles.map((p) => `<a href="/play/${p}">${p}</a>`).join("</li><li>")}</li></ul>`,
  );

  if (!config.bundling) {
    lines.push(`<a href="/bundle">record bundles</a>`);
  }

  lines.push("</html>");
  return lines.join("");
};

app.get("*", async (req, res) => {
  if (req.path === "/") {
    res.write(await ui());
    res.end();
    return;
  }

  if (/^\/stop\/?$/i.test(req.path)) {
    config.play = false;
    config.bundling = false;
    res.write(await ui());
    res.end();
    return;
  }

  if (/^\/play\/.+$/.test(req.path)) {
    const bundle = req.path.split("/").pop();
    const exists = await fsExists(path.join("./data", bundle));
    if (exists) {
      config.play = bundle;
      config.bundling = false;
      res.write(await ui());
      res.end();
      return;
    }

    res.write(await ui(`I don't have a bundle ${bundle}`));
    res.end();
    return;
  }

  if (/^\/bundle\/?$/.test(req.path)) {
    config.play = false;
    config.bundling = true;
    // res.write("The next sequence of requests will be recorded and bundled");
    // console.log("The next sequence of requests will be recorded and bundled");
    // res.end();
    res.write(await ui());
    res.end();
    return;
  }

  const query = Object.entries(req.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  console.log(`REQUEST:  ${req.path}${query.length > 0 ? `?${query}` : ""}`);

  if (config.play) {
    serveBundle(req, res);
  } else {
    proxyToApi(req, res);
  }
});

app.listen(port, () => {
  console.log(`Now listening on ${port}`);
  console.log(
    `Locally-served files is ${config.localService ? "en" : "dis"}abled`,
  );
  console.log(`Recording is ${config.recording ? "en" : "dis"}abled`);
});
