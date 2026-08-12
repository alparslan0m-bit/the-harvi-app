/**
 * ============================================================================
 *  NAVIGATION MAP EXTRACTOR
 * ============================================================================
 *
 *  Walks the Expo Router `app/` directory and produces a complete navigation
 *  tree with screen→component mappings.
 *  Run:  node docs/extractors/navigation-map.js
 *
 *  Outputs:
 *    • Visual tree of all routes
 *    • Screen→component mapping table
 *    • Layout stack/tab configuration
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const appRoot = path.join(projectRoot, "artifacts", "mobile", "app");

// ============================================================================
// 1. BUILD ROUTE TREE
// ============================================================================

function buildRouteTree(dir, prefix = "") {
  const routes = [];

  if (!fs.existsSync(dir)) return routes;

  const items = fs.readdirSync(dir).sort((a, b) => {
    // Directories first, then files; _layout first among files
    const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
    const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    if (a === "_layout.tsx") return -1;
    if (b === "_layout.tsx") return 1;
    return a.localeCompare(b);
  });

  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    const routePath = `${prefix}${item}`;

    if (stat.isDirectory()) {
      const children = buildRouteTree(full, `${routePath}/`);
      routes.push({
        type: "group",
        name: item,
        path: routePath,
        children,
        isGroup: item.startsWith("(") && item.endsWith(")"),
      });
    } else if (item.endsWith(".tsx") || item.endsWith(".ts")) {
      const content = fs.readFileSync(full, "utf8");
      const relPath = path
        .relative(projectRoot, full)
        .replace(/\\/g, "/");

      // Detect what component it renders
      let component = null;
      let componentSource = null;

      // Check for re-export: export { default } from "..."
      const reExportMatch = content.match(
        /export\s*\{\s*(?:default\s+as\s+default|default)\s*\}\s*from\s*["']([^"']+)["']/,
      );
      if (reExportMatch) {
        componentSource = reExportMatch[1];
        component = componentSource.split("/").pop();
      }

      // Check for export default
      const defaultExportMatch = content.match(
        /export\s+default\s+(?:function\s+)?(\w+)/,
      );
      if (defaultExportMatch && !component) {
        component = defaultExportMatch[1];
      }

      // Check for import + export
      const importExportMatch = content.match(
        /import\s+(\w+)\s+from\s*["']([^"']+)["']/,
      );
      if (importExportMatch && !component) {
        component = importExportMatch[1];
        componentSource = importExportMatch[2];
      }

      // Detect layout type
      let layoutType = null;
      if (item === "_layout.tsx") {
        if (content.includes("Tabs") || content.includes("Tab.")) {
          layoutType = "Tabs";
        } else if (content.includes("Stack")) {
          layoutType = "Stack";
        } else if (content.includes("Drawer")) {
          layoutType = "Drawer";
        }
      }

      // Detect if this is a dynamic route
      const isDynamic = item.includes("[") && item.includes("]");

      routes.push({
        type: "file",
        name: item,
        path: routePath,
        relPath,
        component,
        componentSource,
        layoutType,
        isDynamic,
        isLayout: item === "_layout.tsx",
        isNotFound: item === "+not-found.tsx",
      });
    }
  }

  return routes;
}

// ============================================================================
// 2. RENDER TREE
// ============================================================================

function renderTree(routes, prefix = "", isLast = true) {
  let output = "";

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const isLastItem = i === routes.length - 1;
    const connector = isLastItem ? "└── " : "├── ";
    const childPrefix = prefix + (isLastItem ? "    " : "│   ");

    if (route.type === "group") {
      const label = route.isGroup
        ? `${route.name}/`
        : `${route.name}/`;
      output += `${prefix}${connector}${label}\n`;
      output += renderTree(route.children, childPrefix, isLastItem);
    } else {
      let label = route.name;
      let annotation = "";

      if (route.isLayout) {
        annotation = route.layoutType
          ? ` → ${route.layoutType} navigator`
          : " → Layout";
      } else if (route.isNotFound) {
        annotation = " → 404 fallback";
      } else if (route.component) {
        annotation = ` → ${route.component}`;
        if (route.componentSource) {
          annotation += ` (${route.componentSource})`;
        }
      }

      if (route.isDynamic) {
        label = label.replace(/\[(\w+)\]/, ":$1");
      }

      output += `${prefix}${connector}${label}${annotation}\n`;
    }
  }

  return output;
}

// ============================================================================
// 3. COLLECT SCREEN TABLE DATA
// ============================================================================

function collectScreens(routes, parentPath = "") {
  const screens = [];

  for (const route of routes) {
    if (route.type === "group") {
      screens.push(
        ...collectScreens(route.children, `${parentPath}/${route.name}`),
      );
    } else if (!route.isLayout && !route.isNotFound) {
      const urlPath = `${parentPath}/${route.name}`
        .replace(/\.tsx?$/, "")
        .replace(/\/index$/, "/")
        .replace(/\([\w]+\)\//g, "");

      screens.push({
        route: urlPath,
        file: route.relPath,
        component: route.component || "—",
        source: route.componentSource || "—",
        isDynamic: route.isDynamic,
      });
    }
  }

  return screens;
}

// ============================================================================
// 4. COLLECT LAYOUTS
// ============================================================================

function collectLayouts(routes, parentPath = "") {
  const layouts = [];

  for (const route of routes) {
    if (route.type === "group") {
      layouts.push(
        ...collectLayouts(route.children, `${parentPath}/${route.name}`),
      );
    } else if (route.isLayout) {
      layouts.push({
        path: `${parentPath}/`,
        file: route.relPath,
        type: route.layoutType || "—",
        component: route.component || "—",
      });
    }
  }

  return layouts;
}

// ============================================================================
// 5. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const routeTree = buildRouteTree(appRoot);

  let md = `# Navigation Map

> **Auto-generated** by \`docs/extractors/navigation-map.js\`.
> Complete Expo Router navigation tree derived from the \`app/\` directory.

`;

  // ── Visual Tree ─────────────────────────────────────────────────────────
  md += `## 🗺️ Route Tree\n\n`;
  md += `\`\`\`\n`;
  md += `app/\n`;
  md += renderTree(routeTree);
  md += `\`\`\`\n\n`;

  // ── Layouts ─────────────────────────────────────────────────────────────
  const layouts = collectLayouts(routeTree);
  if (layouts.length > 0) {
    md += `## 🏗️ Layouts (Navigators)\n\n`;
    md += `| Path | Type | File | Component |\n`;
    md += `|------|------|------|-----------|\n`;
    for (const l of layouts) {
      md += `| \`${l.path}\` | ${l.type} | \`${l.file}\` | ${l.component} |\n`;
    }
    md += `\n`;
  }

  // ── Screen Table ────────────────────────────────────────────────────────
  const screens = collectScreens(routeTree);
  if (screens.length > 0) {
    md += `## 📱 Screens\n\n`;
    md += `| Route | Component | Source | Dynamic? |\n`;
    md += `|-------|-----------|--------|----------|\n`;
    for (const s of screens) {
      md += `| \`${s.route}\` | ${s.component} | \`${s.source}\` | ${s.isDynamic ? "✅" : ""} |\n`;
    }
    md += `\n`;
  }

  // ── Route count summary ─────────────────────────────────────────────────
  md += `## 📊 Summary\n\n`;
  md += `- **${layouts.length}** layout navigators\n`;
  md += `- **${screens.length}** screen routes\n`;
  md += `- **${screens.filter((s) => s.isDynamic).length}** dynamic routes\n`;
  md += `\n`;

  return md;
}

module.exports = { generate, name: "NAVIGATION_MAP.md" };

if (require.main === module) {
  const md = generate();
  fs.writeFileSync(path.join(projectRoot, "NAVIGATION_MAP.md"), md);
  console.log("✅ NAVIGATION_MAP.md generated");
}
