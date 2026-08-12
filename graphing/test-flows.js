const nodes = require("./data/nodes");
const flows = require("./data/flows");
const edges = require("./data/edges");

// Extract all valid node IDs for O(1) lookup
const validNodeIds = new Set(nodes.map((n) => n.id));

// Extract all valid edges
const validEdges = new Set(edges.map((e) => `${e.source}->${e.target}`));

let hasErrors = false;

console.log("Testing Flows against Nodes and Edges...");

flows.forEach((flow) => {
  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];

    // Check if node exists
    if (!validNodeIds.has(step.node)) {
      console.error(`❌ Flow Error in "${flow.name}" (ID: ${flow.id})`);
      console.error(
        `   Step ${step.order} references invalid node ID: "${step.node}"`,
      );
      hasErrors = true;
    }

    // Check if edge exists to the next step
    if (i < flow.steps.length - 1) {
      const nextStep = flow.steps[i + 1];
      const edgeKey = `${step.node}->${nextStep.node}`;
      if (step.node !== nextStep.node && !validEdges.has(edgeKey)) {
        console.warn(`⚠️ Flow Warning in "${flow.name}" (ID: ${flow.id})`);
        console.warn(
          `   Missing edge connection between "${step.node}" -> "${nextStep.node}"`,
        );
        // We won't set hasErrors = true just yet because maybe not all flows need strict edges,
        // but let's treat it as an error to be safe.
        hasErrors = true;
      }
    }
  }
});

if (hasErrors) {
  console.error(
    "\nTest Failed: Some flows have missing nodes or missing edge connections.",
  );
  process.exit(1);
} else {
  console.log(
    "\n✅ Test Passed: All flows reference valid nodes and have complete edge connections.",
  );
  process.exit(0);
}
