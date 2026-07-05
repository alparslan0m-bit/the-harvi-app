const path = require('path');
const fs = require('fs');

const mappings = [
  { source: "app/(tabs)/(learn)/index.tsx", target: "src/features/learn/components/LearnScreen.tsx", name: "LearnScreen", feature: "learn" },
  { source: "app/(tabs)/(learn)/module/[id].tsx", target: "src/features/learn/components/ModuleScreen.tsx", name: "ModuleScreen", feature: "learn" },
  { source: "app/(tabs)/(learn)/subject/[id].tsx", target: "src/features/learn/components/SubjectScreen.tsx", name: "SubjectScreen", feature: "learn" },
  { source: "app/(tabs)/(learn)/year/[id].tsx", target: "src/features/learn/components/YearScreen.tsx", name: "YearScreen", feature: "learn" },
  { source: "app/(tabs)/profile.tsx", target: "src/features/profile/components/ProfileScreen.tsx", name: "ProfileScreen", feature: "profile" },
  { source: "app/profile/edit.tsx", target: "src/features/profile/components/EditProfileScreen.tsx", name: "EditProfileScreen", feature: "profile" },
  { source: "app/quiz/[lectureId].tsx", target: "src/features/quiz/components/QuizScreen.tsx", name: "QuizScreen", feature: "quiz" },
  { source: "app/(tabs)/stats.tsx", target: "src/features/stats/components/StatsScreen.tsx", name: "StatsScreen", feature: "stats" },
  { source: "app/stats/mastery.tsx", target: "src/features/stats/components/MasteryScreen.tsx", name: "MasteryScreen", feature: "stats" },
  { source: "app/purchase/[moduleId].tsx", target: "src/features/purchase/components/PurchaseScreen.tsx", name: "PurchaseScreen", feature: "purchase" },
  { source: "app/auth.tsx", target: "src/features/auth/components/AuthScreen.tsx", name: "AuthScreen", feature: "auth" },
  { source: "app/auth/callback.tsx", target: "src/features/auth/components/AuthCallbackScreen.tsx", name: "AuthCallbackScreen", feature: "auth" },
];

for (const { source, target, name, feature } of mappings) {
  const sourcePath = path.resolve(source);
  const targetPath = path.resolve(target);
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`Missing source: ${source}`);
    continue;
  }
  
  // 1. Read source
  let content = fs.readFileSync(sourcePath, 'utf8');
  
  // 2. Extract and create target
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  let targetContent = content;
  // Replace export default function with export function name
  targetContent = targetContent.replace(/export\s+default\s+function\s*[A-Za-z0-9_]*\s*\(/, `export function ${name}(`);
  
  fs.writeFileSync(targetPath, targetContent);
  console.log(`Created ${target}`);
  
  // 3. Write thin shell
  const routeName = name + 'Route';
  const shellContent = `import { ${name} } from "@/src/features/${feature}";\n\nexport default function ${routeName}() {\n  return <${name} />;\n}\n`;
  fs.writeFileSync(sourcePath, shellContent);
  console.log(`Rewrote shell ${source}`);
  
  // 4. Update index.ts inside components/
  const componentsIndex = path.join(targetDir, 'index.ts');
  const exportLine = `export * from "./${path.basename(targetPath, '.tsx')}";\n`;
  if (fs.existsSync(componentsIndex)) {
    let indexContent = fs.readFileSync(componentsIndex, 'utf8');
    if (!indexContent.includes(exportLine)) {
      fs.appendFileSync(componentsIndex, exportLine);
    }
  } else {
    fs.writeFileSync(componentsIndex, exportLine);
  }
}
