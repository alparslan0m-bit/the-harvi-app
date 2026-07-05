const fs = require('fs');
const path = require('path');

const mappings = [
  { source: "app/(tabs)/(learn)/index.tsx", name: "LearnScreen", feature: "learn" },
  { source: "app/(tabs)/(learn)/module/[id].tsx", name: "ModuleScreen", feature: "learn" },
  { source: "app/(tabs)/(learn)/subject/[id].tsx", name: "SubjectScreen", feature: "learn" },
  { source: "app/(tabs)/(learn)/year/[id].tsx", name: "YearScreen", feature: "learn" },
  { source: "app/(tabs)/profile.tsx", name: "ProfileScreen", feature: "profile" },
  { source: "app/profile/edit.tsx", name: "EditProfileScreen", feature: "profile" },
  { source: "app/quiz/[lectureId].tsx", name: "QuizScreen", feature: "quiz" },
  { source: "app/(tabs)/stats.tsx", name: "StatsScreen", feature: "stats" },
  { source: "app/stats/mastery.tsx", name: "MasteryScreen", feature: "stats" },
  { source: "app/purchase/[moduleId].tsx", name: "PurchaseScreen", feature: "purchase" },
  { source: "app/auth.tsx", name: "AuthScreen", feature: "auth" },
  { source: "app/auth/callback.tsx", name: "AuthCallbackScreen", feature: "auth" },
];

for (const { source, name, feature } of mappings) {
  const sourcePath = path.resolve(source);
  if (fs.existsSync(sourcePath)) {
    const cleanContent = `export { ${name} as default } from "@/src/features/${feature}";\n`;
    fs.writeFileSync(sourcePath, cleanContent);
    console.log(`Cleaned ${source}`);
  }
}
