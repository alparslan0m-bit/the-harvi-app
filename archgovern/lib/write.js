/**
 * Output writing for archgovern. Writes only files whose content changed and
 * reports which paths were touched.
 */

const fs = require("fs");
const path = require("path");

function writeOutputs(result, config) {
  const changedPaths = [];

  const nodesJsContent = `module.exports = ${JSON.stringify(result.verifiedNodes, null, 2)};\n`;
  const edgesJsContent = `module.exports = ${JSON.stringify(result.verifiedEdges, null, 2)};\n`;

  const outputs = [
    [path.join(config.dataDir, "nodes.js"), nodesJsContent],
    [path.join(config.dataDir, "edges.js"), edgesJsContent],
    [config.jsonFile, result.jsonString],
    [config.mdFile, result.mdString],
    [config.chartsMdFile, result.chartsMdString],
  ];

  if (result.htmlString !== null && result.htmlString !== undefined) {
    outputs.push([config.htmlFile, result.htmlString]);
  }

  for (const [filePath, content] of outputs) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const existingContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
    if (existingContent !== content) {
      fs.writeFileSync(filePath, content);
      changedPaths.push(filePath);
    }
  }

  return { changedPaths };
}

module.exports = { writeOutputs };
