const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/features/chat/offensiveLanguage.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const language = { exports: {} };
new Function('module', 'exports', compiled)(language, language.exports);
const cases = require('./fixtures/chat-language-cases.json');
test('native offline detector passes the canonical English/Filipino corpus', () => {
  for (const [group, expected] of [['flagged', true], ['clean', false]]) {
    for (const text of cases[group]) assert.equal(language.exports.containsOffensiveLanguage(text), expected, text);
  }
});
