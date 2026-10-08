import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Test-only module hooks. They let `node --test` load the application's TypeScript and JSX
// source directly, using the TypeScript compiler the project already has, so the real page
// markup can be rendered without a browser, a bundler or a second test framework.
export const sourceRoot = path.resolve(import.meta.dirname, "../../src");
const serverOnlyStub = path.resolve(import.meta.dirname, "server-only-stub.cjs");
const sourceUrl = pathToFileURL(sourceRoot).href;

function sourceFile(base) {
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: pathToFileURL(serverOnlyStub).href, format: "commonjs", shortCircuit: true };
    }
    let base;
    if (specifier.startsWith("@/")) base = path.join(sourceRoot, specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith(sourceUrl)) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    const file = base && sourceFile(base);
    if (!file) return nextResolve(specifier, context);
    return { url: pathToFileURL(file).href, format: "commonjs", shortCircuit: true };
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(sourceUrl) || !/\.tsx?$/.test(url)) return nextLoad(url, context);
    const { outputText } = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
      fileName: fileURLToPath(url),
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    return { format: "commonjs", source: outputText, shortCircuit: true };
  },
});

const require = createRequire(import.meta.url);

// Loads a module from `src/` by its path relative to that directory.
export function loadSource(relativePath) {
  return require(path.join(sourceRoot, relativePath));
}

export function renderHtml(element) {
  return renderToStaticMarkup(element);
}

// Every file under `src/`, as paths relative to it with forward slashes.
export function sourceFiles(directory = sourceRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return [path.relative(sourceRoot, full).replaceAll("\\", "/")];
  });
}

export function readSource(relativePath) {
  return readFileSync(path.join(sourceRoot, relativePath), "utf8");
}
