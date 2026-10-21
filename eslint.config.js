import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    // Pre-pivot features kept behind flags.js (off). Not shipped; not maintained to current lint rules.
    'src/pages/FirmDetail.jsx',
    'src/pages/Onboarding.jsx',
    'src/pages/Dashboard.jsx',
    'src/pages/Login.jsx',
    'src/pages/Signup.jsx',
    'src/pages/Settings.jsx',
    'src/pages/Pricing.jsx',
    'src/components/DocumentGenerator.jsx',
    'src/components/Kanban*.jsx',
    'src/components/ProfileForm.jsx',
    'src/components/UpgradePrompt.jsx',
    'src/context/AuthContext.jsx',
    'src/lib/stripe.js',
    'src/lib/ai.js',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    rules: {
      // Credits JSX usage, including member elements like <motion.g> (marks `motion` as used).
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['worker/**/*.js', 'api/**/*.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
])
