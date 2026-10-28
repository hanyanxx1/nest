import { existsSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { transformSync } from '@swc/core';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(import.meta.dirname, '..');
const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
const parsedTsconfig = ts.parseConfigFileTextToJson(
  tsconfigPath,
  readFileSync(tsconfigPath, 'utf8'),
);
if (parsedTsconfig.error) {
  throw new Error(
    ts.flattenDiagnosticMessageText(parsedTsconfig.error.messageText, '\n'),
  );
}
const tsconfig = parsedTsconfig.config;
const paths = tsconfig.compilerOptions.paths ?? {};
const aliases = new Map(
  Object.entries(paths).map(([specifier, targets]) => [
    specifier,
    path.resolve(projectRoot, targets[0]),
  ]),
);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliasTarget = aliases.get(specifier);
    if (aliasTarget && existsSync(aliasTarget)) {
      return {
        url: pathToFileURL(aliasTarget).href,
        shortCircuit: true,
      };
    }

    if (specifier.startsWith('.') && specifier.endsWith('.js')) {
      const parentUrl = context.parentURL;
      if (parentUrl?.startsWith('file:')) {
        const tsPath = fileURLToPath(new URL(specifier, parentUrl)).replace(
          /\.js$/,
          '.ts',
        );
        if (existsSync(tsPath)) {
          return {
            url: pathToFileURL(tsPath).href,
            shortCircuit: true,
          };
        }
      }
    }

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
      const filename = fileURLToPath(url);
      const source = readFileSync(filename, 'utf8');
      const output = transformSync(source, {
        filename,
        sourceMaps: 'inline',
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
          target: 'es2022',
        },
        module: {
          type: 'es6',
        },
      });

      return {
        format: 'module',
        source: output.code,
        shortCircuit: true,
      };
    }

    return nextLoad(url, context);
  },
});
