/**
 * archgovern config for the test fixture project.
 */

module.exports = {
  projectName: "Fixture",

  sourceRoots: ["src"],
  fileExtensions: [".ts", ".tsx"],
  skipDirs: ["node_modules"],

  aliases: { "@": "" },

  nodeMapping: {
    app: ["src/app"],
    lib: ["src/lib"],
    store: ["src/store"],
    remote: ["src/remote.ts"],
  },

  externalPackageMap: {
    react: "react",
    "zustand-store-pkg": "zustand",
  },

  remoteNodes: {
    backend_api: {
      patterns: [/api\.auth\./],
      description: "Remote backend API",
    },
  },

  implicitEdges: [
    {
      source: "app",
      targets: ["backend_api"],
      marker: /callRemote\(/,
    },
  ],

  derivedFacts: [
    {
      name: "endpoints",
      applyTo: ["lib"],
      files: [{ type: "file", path: "src/lib/api.ts" }],
      extract: (entries) => {
        const items = [];
        const re = /registerEndpoint\("([^"]+)"/g;
        for (const entry of entries) {
          let m;
          while ((m = re.exec(entry.content)) !== null) items.push(m[1]);
        }
        return items;
      },
      description: (items, node) =>
        items.length ? `API layer. Endpoints: ${items.join(", ")}` : null,
    },
  ],

  curatedContentBans: [
    { phrase: "legacyApi", reason: "renamed — this is a test fixture" },
  ],

  orderedLayers: ["presentation", "application", "infrastructure", "external"],
  layerClasses: {
    presentation: "fill:#f472b6,stroke:#831843,stroke-width:2px,color:#000",
    application: "fill:#60a5fa,stroke:#1e3a8a,stroke-width:2px,color:#000",
    infrastructure: "fill:#fbbf24,stroke:#78350f,stroke-width:2px,color:#000",
    external: "fill:#a1a1aa,stroke:#3f3f46,stroke-width:2px,color:#000",
  },

  dataDir: "archgovern/data",
  jsonFile: "archgovern/architecture.json",
  htmlFile: "archgovern/architecture.html",
  mdFile: "archgovern/ARCHITECTURE.md",
  chartsMdFile: "archgovern/ARCHITECTURE_CHARTS.md",
};
