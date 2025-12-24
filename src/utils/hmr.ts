export const styleInjector = (styleId: string, css: string): string => {
  const styleContent = JSON.stringify(css);
  const styleKey = JSON.stringify(styleId);
  return [
    `const __vp_style = ${styleContent};`,
    `if (typeof document !== 'undefined' && !document.getElementById(${styleKey})) {`,
    `  const el = document.createElement('style');`,
    `  el.id = ${styleKey};`,
    `  el.textContent = __vp_style;`,
    `  document.head.appendChild(el);`,
    `}`,
  ].join('\n');
};

export const buildVueHmrSnippet = (entry: string, code: string): string => {
  const findDefaultRef = () => {
    const m1 = code.match(/export\s+default\s+([A-Za-z0-9_$]+)/);
    if (m1) return m1[1];
    const m2 = code.match(/export\s+\{\s*([A-Za-z0-9_$]+)\s+as\s+default\s*\}/);
    if (m2) return m2[1];
    return null;
  };

  const defaultRef = findDefaultRef();
  const hmrId = JSON.stringify(entry);
  return [
    `if (import.meta.hot) {`,
    defaultRef
      ? [
          `  const __vp_component = typeof ${defaultRef} !== 'undefined' ? ${defaultRef} : undefined;`,
          `  if (__vp_component && typeof __VUE_HMR_RUNTIME__ !== 'undefined') {`,
          `    __vp_component.__hmrId = ${hmrId};`,
          `    if (!__VUE_HMR_RUNTIME__.createRecord(${hmrId}, __vp_component)) {`,
          `      __VUE_HMR_RUNTIME__.reload(${hmrId}, __vp_component);`,
          `    }`,
          `  }`,
        ].join('\n')
      : `  // no default export reference found for HMR bootstrap`,
    `  import.meta.hot.accept((mod) => {`,
    `    const __next = mod && mod.default;`,
    `    if (__next && typeof __VUE_HMR_RUNTIME__ !== 'undefined') {`,
    `      __next.__hmrId = ${hmrId};`,
    `      __VUE_HMR_RUNTIME__.reload(${hmrId}, __next);`,
    `    }`,
    `  });`,
    `}`,
  ].join('\n');
};
