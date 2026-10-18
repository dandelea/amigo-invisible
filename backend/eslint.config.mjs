// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ESLint del backend: reglas recomendadas de JavaScript y de TypeScript con
// información de tipos. El formato lo lleva Prettier (eslint-config-prettier
// desactiva las reglas que chocarían con él).
export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'drizzle/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Una promesa sin esperar ni capturar suele ser un error.
      '@typescript-eslint/no-floating-promises': 'error',
      // Variables sin usar, salvo las que empiezan por _ (p. ej. en
      // desestructuraciones o parámetros obligatorios).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // En los tests se trabaja con cuerpos de respuesta sin tipar (supertest)
    // y con espías: se relajan las reglas sobre valores `any`.
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  prettier,
);
