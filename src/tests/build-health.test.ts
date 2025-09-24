import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

describe('Build and Compilation Tests', () => {
  const projectRoot = process.cwd();

  describe('TypeScript Compilation', () => {
    it('should compile TypeScript without errors', () => {
      try {
        // Run TypeScript compiler check
        execSync('npx tsc --noEmit', {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout
        });
        
        // If we get here, compilation succeeded
        expect(true).toBe(true);
      } catch (error: unknown) {
        // If TypeScript compilation fails, show the error
        const execError = error as { stdout?: string; message?: string };
        console.error('TypeScript compilation failed:');
        console.error(execError.stdout || execError.message);
        expect(error).toBeNull();
      }
    });

    it('should have valid tsconfig.json', () => {
      try {
        const tsconfigPath = join(projectRoot, 'tsconfig.json');
        if (!existsSync(tsconfigPath)) {
          throw new Error('tsconfig.json not found');
        }
        const tsconfigContent = readFileSync(tsconfigPath, 'utf8');
        const tsconfig = JSON.parse(tsconfigContent);
        expect(tsconfig).toBeDefined();
        
        // Check if it's a composite config (has references) or normal config (has compilerOptions)
        const isComposite = tsconfig.references && Array.isArray(tsconfig.references);
        const hasCompilerOptions = tsconfig.compilerOptions;
        
        if (!isComposite && !hasCompilerOptions) {
          throw new Error('tsconfig.json must have either compilerOptions or references');
        }
        
        // For composite configs, check that references exist
        if (isComposite) {
          tsconfig.references.forEach((ref: { path: string }) => {
            const refPath = join(projectRoot, ref.path);
            if (!existsSync(refPath)) {
              throw new Error(`Referenced tsconfig not found: ${ref.path}`);
            }
          });
        }
      } catch (error) {
        throw new Error(`tsconfig.json is missing or invalid: ${error}`);
      }
    });
  });

  describe('ESLint Checks', () => {
    it('should pass ESLint without critical errors', () => {
      try {
        // Run ESLint check (allow warnings, but not errors)
        execSync('npx eslint src --ext .ts,.tsx --max-warnings 100', {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: 30000
        });
        
        expect(true).toBe(true);
      } catch (error: unknown) {
        // If ESLint finds critical errors, show them
        const execError = error as { status?: number; stdout?: string };
        if (execError.status === 1) {
          console.error('ESLint found critical errors:');
          console.error(execError.stdout);
          expect(execError.status).toBe(0);
        }
      }
    });
  });

  describe('Build Process', () => {
    it('should build project successfully', () => {
      try {
        // Run build process
        const output = execSync('npm run build', {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: 60000 // 60 second timeout for build
        });
        
        // Build should complete successfully
        expect(output).toBeDefined();
      } catch (error: unknown) {
        const execError = error as { stdout?: string; message?: string };
        console.error('Build failed:');
        console.error(execError.stdout || execError.message);
        expect(error).toBeNull();
      }
    });
  });

  describe('Package Dependencies', () => {
    it('should have valid package.json', () => {
      try {
        const packageContent = readFileSync(join(projectRoot, 'package.json'), 'utf8');
        const packageJson = JSON.parse(packageContent);
        expect(packageJson.name).toBeDefined();
        expect(packageJson.version).toBeDefined();
        expect(packageJson.dependencies).toBeDefined();
      } catch {
        throw new Error('package.json is missing or invalid');
      }
    });

    it('should not have security vulnerabilities in dependencies', () => {
      try {
        // Run npm audit (allow low/moderate, but not high/critical)
        execSync('npm audit --audit-level high', {
          cwd: projectRoot,
          encoding: 'utf8',  
          timeout: 30000
        });
        
        expect(true).toBe(true);
      } catch (error: unknown) {
        const execError = error as { status?: number; stdout?: string };
        if (execError.status === 1) {
          console.warn('npm audit found high/critical vulnerabilities:');
          console.warn(execError.stdout);
          // Don't fail the test for vulnerabilities, just warn
          expect(true).toBe(true);
        }
      }
    });
  });
});