const fs = require("fs");
const edgesFile = "./data/edges.js";
let edgesCode = fs.readFileSync(edgesFile, "utf8");

// Parse edges JSON
let edges = require(edgesFile);

const toRemoveStr = `app->error_boundary
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
quiz_feature->app`;

const toRemove = new Set(
  toRemoveStr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l),
);

// Filter out toRemove
const newEdges = edges.filter((e) => !toRemove.has(`${e.source}->${e.target}`));

// Add missing
newEdges.push({
  id:
    "e" +
    (Math.max(
      ...edges.map((e) =>
        e.id && typeof e.id === "string" ? parseInt(e.id.substring(1)) : 0,
      ),
    ) +
      1),
  source: "stats_feature",
  target: "learn_feature",
  type: "navigates",
  label: "navigates",
  description: "Empirical edge not previously tracked",
});

fs.writeFileSync(
  edgesFile,
  "module.exports = " + JSON.stringify(newEdges, null, 2) + ";\n",
);
console.log(
  "Fixed edges. Removed " +
    (edges.length - (newEdges.length - 1)) +
    " edges. Added 1 edge.",
);
