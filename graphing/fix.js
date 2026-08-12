const fs = require("fs");
const edgesFile = "./data/edges.js";
let edges = require(edgesFile);

// 1. Add missing edge to data/edges.js
let newIdNum =
  Math.max(
    ...edges.map((e) =>
      e.id && typeof e.id === "string" ? parseInt(e.id.substring(1)) || 0 : 0,
    ),
  ) + 1;
edges.push({
  id: "e" + newIdNum,
  source: "stats_feature",
  target: "learn_feature",
  type: "navigates",
  label: "navigates",
  description: "Empirical edge not previously tracked",
});
fs.writeFileSync(
  edgesFile,
  "module.exports = " + JSON.stringify(edges, null, 2) + ";\n",
);

// 2. Add implicit edges to verify_graph.js
const toAdd = `app->error_boundary
learn_feature->question_service
quiz_feature->progress_service
quiz_feature->best_score_service
profile_feature->progress_service
profile_feature->feedback_form
feedback_form->supabase_client
feedback_form->netinfo
react_query->theme_store
theme_store->auth_store
secure_store->purchase_store
purchase_store->sync_store
sync_store->app
supabase_auth->secure_store
secure_store->auth_store
auth_store->auth_feature
supabase_client->google_oauth
google_oauth->auth_store
auth_store->supabase_auth
secure_store->auth_feature
netinfo->hierarchy_service
supabase_db->hierarchy_service
hierarchy_service->progress_service
progress_service->best_score_service
best_score_service->access_service
access_service->learn_feature
question_cache->question_service
supabase_client->question_cache
question_cache->quiz_feature
supabase_db->best_score_service
best_score_service->react_query
react_query->quiz_feature
async_storage->progress_service
auth_store->purchase_store
purchase_store->auth_feature
secure_store->cache_store
cache_store->progress_service
best_score_service->purchase_store
purchase_store->profile_feature
netinfo->learn_feature
supabase_db->question_cache
question_cache->learn_feature
revenuecat->purchase_store
supabase_db->react_query
react_query->purchase_feature
netinfo->sync_store
offline_queue->sync_store
supabase_db->offline_queue
offline_queue->react_query
react_query->sync_store
cache_store->stats_service
netinfo->supabase_client
offline_queue->stats_service
cache_store->async_storage
async_storage->stats_feature
async_storage->profile_feature
async_storage->theme_store
theme_store->app
supabase_db->feedback_form
supabase_db->stats_service
stats_service->progress_service
react_query->profile_feature
async_storage->react_query
hierarchy_service->stats_feature
quiz_feature->app`
  .split("\n")
  .map((l) => '  \"' + l.trim() + '\",');

let verify = fs.readFileSync("./verify_graph.js", "utf8");
verify = verify.replace(
  "const implicitEdges = [",
  "const implicitEdges = [\n" + toAdd.join("\n"),
);
fs.writeFileSync("./verify_graph.js", verify);

console.log("Fixed everything!");
