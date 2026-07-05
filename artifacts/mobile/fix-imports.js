const fs = require('fs');
const path = require('path');

const directories = ['app', 'src'];

const replacements = [
  // Contexts -> Stores
  { from: /@\/context\/AuthContext/g, to: '@/src/shared/store/authStore' },
  { from: /@\/context\/PurchaseContext/g, to: '@/src/shared/store/purchaseStore' },
  { from: /@\/context\/SyncContext/g, to: '@/src/shared/store/syncStore' },
  { from: /@\/context\/ThemeContext/g, to: '@/src/shared/store/themeStore' },

  // Lib -> Services/Types/Utils
  { from: /@\/lib\/supabase/g, to: '@/src/shared/services/supabase' },
  { from: /@\/lib\/offlineQueue/g, to: '@/src/shared/services/offlineQueue' },
  { from: /@\/lib\/schemas/g, to: '@/src/shared/types/schemas' },
  { from: /@\/lib\/crypto/g, to: '@/src/shared/utils/crypto' },
  { from: /@\/lib\/questionCache/g, to: '@/src/features/quiz/services/questionCache' },

  // Constants
  { from: /@\/constants\/colors/g, to: '@/src/shared/constants/theme' },
  { from: /@\/constants\/storage/g, to: '@/src/shared/constants/storage' },
  { from: /@\/constants/g, to: '@/src/shared/constants' },

  // Types
  { from: /@\/types/g, to: '@/src/shared/types' },

  // Utils
  { from: /@\/utils\/answerResolver/g, to: '@/src/features/quiz/utils/answerResolver' },
  { from: /@\/utils\/quizHelpers/g, to: '@/src/features/quiz/utils/quizHelpers' },
  { from: /@\/utils/g, to: '@/src/features/quiz/utils' }, // fallback

  // Services
  { from: /@\/services\/accessService/g, to: '@/src/features/learn/services/accessService' },
  { from: /@\/services\/hierarchyService/g, to: '@/src/features/learn/services/hierarchyService' },
  { from: /@\/services\/progressService/g, to: '@/src/features/learn/services/progressService' },
  { from: /@\/services\/questionService/g, to: '@/src/features/quiz/services/questionService' },
  { from: /@\/services\/statsService/g, to: '@/src/features/stats/services/statsService' },

  // Hooks (Shared)
  { from: /@\/hooks\/useColors/g, to: '@/src/shared/hooks/useColors' },
  { from: /@\/hooks\/useFeedback/g, to: '@/src/shared/hooks/useFeedback' },
  { from: /@\/hooks\/useNetworkStatus/g, to: '@/src/shared/hooks/useNetworkStatus' },
  { from: /@\/hooks\/useScreenAnimation/g, to: '@/src/shared/hooks/useScreenAnimation' },
  { from: /@\/hooks\/useSyncSession/g, to: '@/src/shared/store/syncStore' }, // wait, useSyncSession is exported from syncStore

  // Hooks (Feature)
  { from: /@\/hooks\/useAuthForm/g, to: '@/src/features/auth/hooks/useAuthForm' },
  { from: /@\/hooks\/useHierarchy/g, to: '@/src/features/learn/hooks/useHierarchy' },
  { from: /@\/hooks\/useLearnFlow/g, to: '@/src/features/learn/hooks/useLearnFlow' },
  { from: /@\/hooks\/useMasteryFilter/g, to: '@/src/features/learn/hooks/useMasteryFilter' },
  { from: /@\/hooks\/useModuleAccess/g, to: '@/src/features/learn/hooks/useModuleAccess' },
  { from: /@\/hooks\/useProgress/g, to: '@/src/features/learn/hooks/useProgress' },
  { from: /@\/hooks\/useSubjectCache/g, to: '@/src/features/learn/hooks/useSubjectCache' },
  { from: /@\/hooks\/useMyPurchases/g, to: '@/src/features/purchase/hooks/useMyPurchases' },
  { from: /@\/hooks\/usePurchase/g, to: '@/src/features/purchase/hooks/usePurchase' },
  { from: /@\/hooks\/useProfileData/g, to: '@/src/features/profile/hooks/useProfileData' },
  { from: /@\/hooks\/useProfileEdit/g, to: '@/src/features/profile/hooks/useProfileEdit' },
  { from: /@\/hooks\/useQuizResultsAnimation/g, to: '@/src/features/quiz/hooks/useQuizResultsAnimation' },
  { from: /@\/hooks\/useQuizSession/g, to: '@/src/features/quiz/hooks/useQuizSession' },
  { from: /@\/hooks\/useQuiz/g, to: '@/src/features/quiz/hooks/useQuiz' },
  { from: /@\/hooks\/useStats/g, to: '@/src/features/stats/hooks/useStats' },
  { from: /@\/hooks/g, to: '@/src/shared/hooks' }, // fallback

  // Components
  { from: /@\/components\/learn\/([^"']+)/g, to: '@/src/features/learn/components/$1' },
  { from: /@\/components\/profile\/([^"']+)/g, to: '@/src/features/profile/components/$1' },
  { from: /@\/components\/quiz\/([^"']+)/g, to: '@/src/features/quiz/components/$1' },
  { from: /@\/components\/stats\/([^"']+)/g, to: '@/src/features/stats/components/$1' },
  { from: /@\/components\/ui\/([^"']+)/g, to: '@/src/shared/components/$1' },
  { from: /@\/components\/ui/g, to: '@/src/shared/components' },
  { from: /@\/components/g, to: '@/src/shared/components' }, // fallback for @/components
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { from, to } of replacements) {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  // Handle local imports like '../hooks/useProgress' or '../../components/ui/Button'
  // Since files moved, relative paths might be completely broken.
  // We'll leave them as is for now and hope tsc catches them, but actually we should 
  // try to use @/ paths everywhere.
  // Let's replace any `../lib/supabase` with `@/src/shared/services/supabase` etc.
  
  const relativeReplacements = [
    { from: /\.\.\/\.\.\/components\/ui/g, to: '@/src/shared/components' },
    { from: /\.\.\/components\/ui/g, to: '@/src/shared/components' },
    { from: /\.\.\/\.\.\/hooks\//g, to: '@/src/shared/hooks/' }, // wild guess
  ];

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

for (const dir of directories) {
  processDirectory(dir);
}
