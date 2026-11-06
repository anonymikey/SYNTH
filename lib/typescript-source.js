const MODULE_STATEMENT = /^\s*(?:import|export)\b/m;
const MODULE_META = /\bimport\s*\./;
const NODE_REQUIRE = /\brequire\s*\(/;

export function assertStandaloneTypeScript(source) {
  const code = String(source || '');
  if (MODULE_STATEMENT.test(code) || MODULE_META.test(code) || NODE_REQUIRE.test(code)) {
    throw new Error('This TypeScript preview supports one script.ts file without module imports, exports, or Node require calls. Keep browser logic in that file.');
  }
  return code;
}
