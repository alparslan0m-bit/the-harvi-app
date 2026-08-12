const fs = require("fs");
const path = require("path");

const nodes = require("./data/nodes");
const edges = require("./data/edges");
const flows = require("./data/flows");

const architecture = {
  nodes,
  edges,
  flows,
};

// Generate JSON
fs.writeFileSync(
  path.join(__dirname, "architecture.json"),
  JSON.stringify(architecture, null, 2),
);

// Generate HTML
const templatePath = path.join(__dirname, "template.html");
let htmlContent = fs.readFileSync(templatePath, "utf8");
htmlContent = htmlContent.replace(
  "__ARCHITECTURE_JSON__",
  JSON.stringify(architecture),
);

fs.writeFileSync(path.join(__dirname, "architecture.html"), htmlContent);
console.log("Files generated successfully.");
