/**
 * 码叮工具箱 · Client 契约测试
 * 不渲染 UI，只确认 bundle 能被 ModuleLoader 接住、apply 能注册侧栏与主面板。
 * 运行：node tests/client-structure.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(dir, '..', 'client.js'), 'utf8');

let loaded = null;
const window = {
  __ModuleLoader__: {
    load(entry) {
      loaded = entry;
    },
  },
};
const head = {
  appendChild(node) {
    this.child = node;
  },
};
const document = {
  head,
  createElement(tag) {
    return {
      tagName: tag,
      textContent: '',
      setAttribute() {},
      remove() {},
    };
  },
};
const reactStub = {
  createElement(...args) {
    return { type: args[0], props: args[1], children: args.slice(2) };
  },
  Fragment: Symbol('Fragment'),
  useState: (value) => [value, () => {}],
  useEffect: () => {},
  useRef: (value) => ({ current: value }),
};

new Function('window', 'document', 'require', source)(window, document, (name) => {
  if (name === 'react') return reactStub;
  throw new Error(`unexpected require: ${name}`);
});

assert.ok(loaded, 'bundle called __ModuleLoader__.load');
assert.equal(loaded.id, 'dsh-mading-toolbox');

const mod = loaded.factory((name) => {
  if (name === 'react') return reactStub;
  throw new Error(`unexpected require: ${name}`);
});
assert.equal(mod.isPlugin, true);
assert.deepEqual(mod.inject, ['slots', 'locale']);
assert.equal(typeof mod.apply, 'function');

const registrations = [];
let registeredDomain = null;
const dictionaries = {};
const t = (key) => key;
const ctx = {
  effect(fn) {
    fn();
  },
  locale: {
    bind(domain) {
      registeredDomain = domain;
      return t;
    },
    register(domain, lang, dict) {
      dictionaries[lang] = dict;
      return () => {};
    },
  },
  slots: {
    inject(name, cb) {
      assert.equal(typeof cb, 'function');
      cb();
    },
    register(meta, component) {
      registrations.push({ meta, component });
      return () => {};
    },
  },
};

mod.apply(ctx);
assert.equal(registeredDomain, 'mading-toolbox');
assert.ok(registrations.some((r) => r.meta.name === 'sidebar.panellist' && r.meta.id === 'mading-toolbox'));
assert.ok(registrations.some((r) => r.meta.name === 'main' && r.meta.key === 'mading-toolbox'));
assert.equal(typeof registrations[0].component, 'function');

const usedKeys = new Set([...source.matchAll(/\bt\('([^']+)'\)/g)].map((match) => match[1]));
for (const lang of ['zh', 'en']) {
  assert.ok(dictionaries[lang], `locale ${lang} registered`);
  for (const key of usedKeys) {
    assert.ok(key in dictionaries[lang], `locale ${lang} missing key: ${key}`);
  }
}
console.log('client bundle ok:', registrations.map((r) => r.meta.name).join(', '), `(${usedKeys.size} keys)`);
