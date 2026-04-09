document.addEventListener("DOMContentLoaded", () => {
  enhanceButtonCards();
});

function enhanceButtonCards() {
  const cards = document.querySelectorAll(".button-card");

  cards.forEach((card, index) => {
    const copyRoot = card.querySelector("[data-copy-root]") || card.querySelector(".btn");
    if (!copyRoot) return;

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "copy-snippet-button";
    copyButton.setAttribute("aria-label", "Copy button HTML and CSS");
    copyButton.innerHTML = '<i class="bi bi-copy" aria-hidden="true"></i>';

    copyButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const snippet = buildStandaloneSnippet(copyRoot);

      try {
        await navigator.clipboard.writeText(snippet);
        showCopySuccess(copyButton);
      } catch (error) {
        console.error("Failed to copy snippet:", error);
        showCopyFailure(copyButton);
      }
    });

    card.append(copyButton);
    card.dataset.copyIndex = String(index);
  });
}

function buildStandaloneSnippet(button) {
  const buttonClasses = Array.from(button.classList).filter((className) => className !== "btn");
  const primaryClass = pickPrimaryExportClass(buttonClasses);
  const exportTag = button.tagName.toLowerCase();
  const relatedClasses = new Set([
    primaryClass,
    ...buttonClasses,
    ...Array.from(button.querySelectorAll("[class]")).flatMap((element) =>
      Array.from(element.classList).filter(Boolean)
    ),
  ]);
  const collectedRules = [];
  const keyframes = new Map();

  const localSheet = getLocalStyleSheet();
  if (localSheet) {
    walkRules(localSheet.cssRules, primaryClass, exportTag, relatedClasses, collectedRules, keyframes);
  }

  const neededKeyframes = findReferencedKeyframes(collectedRules, keyframes);
  const exportButton = button.cloneNode(true);
  if (button.classList.contains("btn")) {
    exportButton.className = primaryClass;
  }
  const baseRule = buildBaseExport(button, primaryClass, exportTag);
  const descendantRules = buildDescendantExports(button, primaryClass, exportTag);
  const iconLink = button.querySelector(".bi")
    ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">\n\n'
    : "";

  const html = exportButton.outerHTML;
  const css = [
    baseRule,
    ...descendantRules,
    ...collectedRules,
    ...neededKeyframes.map((name) => keyframes.get(name)).filter(Boolean),
  ]
    .filter(Boolean)
    .join("\n\n");

  return `${iconLink}<style>\n${css}\n</style>\n\n${html}`;
}

function pickPrimaryExportClass(classNames) {
  const genericClasses = new Set(["btn", "btn-set"]);
  return classNames.find((className) => !genericClasses.has(className)) || classNames[0] || "export-btn";
}

function buildBaseExport(sourceButton, primaryClass, exportTag) {
  const style = window.getComputedStyle(sourceButton);
  const declarations = [
    "box-sizing: border-box;",
    "appearance: none;",
    "-webkit-appearance: none;",
    `position: ${style.position};`,
    `display: ${style.display};`,
    `align-items: ${style.alignItems};`,
    `justify-content: ${style.justifyContent};`,
    `gap: ${style.gap};`,
    `padding: ${style.padding};`,
    `min-width: ${style.minWidth};`,
    `min-height: ${style.minHeight};`,
    `font-family: ${style.fontFamily};`,
    `font-size: ${style.fontSize};`,
    `font-weight: ${style.fontWeight};`,
    `line-height: ${style.lineHeight};`,
    `letter-spacing: ${style.letterSpacing};`,
    `text-transform: ${style.textTransform};`,
    `white-space: ${style.whiteSpace};`,
    `text-decoration: ${style.textDecoration};`,
    `color: ${style.color};`,
    `background: ${style.background};`,
    `border: ${style.border};`,
    `border-radius: ${style.borderRadius};`,
    `box-shadow: ${style.boxShadow};`,
    `cursor: ${style.cursor};`,
    `overflow: ${style.overflow};`,
    `isolation: ${style.isolation};`,
    `transition: ${style.transition};`,
  ];

  return `${exportTag}.${primaryClass} {\n  ${declarations.join("\n  ")}\n}`;
}

function buildDescendantExports(sourceButton, primaryClass, exportTag) {
  const rules = [];
  const sourceChildren = sourceButton.querySelectorAll("*");
  sourceChildren.forEach((child) => {
    const childClassList = Array.from(child.classList).filter(Boolean);
    const selector = childClassList.length
      ? `${exportTag}.${primaryClass} .${childClassList.join(".")}`
      : `${exportTag}.${primaryClass} ${child.tagName.toLowerCase()}`;

    const style = window.getComputedStyle(child);
    const declarations = [
      "box-sizing: border-box;",
      "appearance: none;",
      "-webkit-appearance: none;",
      `position: ${style.position};`,
      `z-index: ${style.zIndex};`,
      `display: ${style.display};`,
      `align-items: ${style.alignItems};`,
      `justify-content: ${style.justifyContent};`,
      `gap: ${style.gap};`,
      `width: ${style.width};`,
      `min-width: ${style.minWidth};`,
      `height: ${style.height};`,
      `min-height: ${style.minHeight};`,
      `padding: ${style.padding};`,
      `font-family: ${style.fontFamily};`,
      `font-size: ${style.fontSize};`,
      `font-weight: ${style.fontWeight};`,
      `line-height: ${style.lineHeight};`,
      `letter-spacing: ${style.letterSpacing};`,
      `color: ${style.color};`,
      `background: ${style.background};`,
      `border: ${style.border};`,
      `border-radius: ${style.borderRadius};`,
      `box-shadow: ${style.boxShadow};`,
      `opacity: ${style.opacity};`,
      `transform: ${style.transform};`,
      `cursor: ${style.cursor};`,
      `transition: ${style.transition};`,
    ].filter((line) => !line.endsWith(": ;") && !line.includes("undefined"));

    rules.push(`${selector} {\n  ${declarations.join("\n  ")}\n}`);
  });

  return dedupeRules(rules);
}

function getLocalStyleSheet() {
  return Array.from(document.styleSheets).find((sheet) => {
    try {
      return sheet.href && sheet.href.endsWith("styles.css");
    } catch (error) {
      return false;
    }
  });
}

function walkRules(rules, primaryClass, exportTag, relatedClasses, collectedRules, keyframes) {
  Array.from(rules).forEach((rule) => {
    if (rule.type === CSSRule.STYLE_RULE) {
      const selectorText = rule.selectorText || "";
      const scopedRule = scopeRuleToButton(selectorText, rule.style, primaryClass, exportTag, relatedClasses);
      if (scopedRule) {
        collectedRules.push(scopedRule);
      }
      return;
    }

    if (rule.type === CSSRule.KEYFRAMES_RULE) {
      keyframes.set(rule.name, resolveCSSValue(rule.cssText));
      return;
    }

    if (rule.cssRules) {
      walkRules(rule.cssRules, primaryClass, exportTag, relatedClasses, collectedRules, keyframes);
    }
  });
}

function scopeRuleToButton(selectorText, styleDeclaration, primaryClass, exportTag, relatedClasses) {
  if (!selectorText) {
    return "";
  }

  const scopedSelectors = selectorText
    .split(",")
    .map((part) => part.trim())
    .filter((part) => selectorMatchesPrimaryButton(part, primaryClass, relatedClasses))
    .map((part) => normalizeSelectorForExport(part, primaryClass, exportTag, relatedClasses));

  if (!scopedSelectors.length) {
    return "";
  }

  const declarationText = resolveStyleDeclaration(styleDeclaration);
  if (!declarationText) {
    return "";
  }

  return `${scopedSelectors.join(", ")} { ${declarationText} }`;
}

function findReferencedKeyframes(collectedRules, keyframes) {
  const animationNames = new Set();
  const knownNames = Array.from(keyframes.keys());

  collectedRules.forEach((ruleText) => {
    knownNames.forEach((name) => {
      const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`);
      if (pattern.test(ruleText)) {
        animationNames.add(name);
      }
    });
  });

  return Array.from(animationNames);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeRules(rules) {
  return Array.from(new Set(rules));
}

function selectorMatchesPrimaryButton(selector, primaryClass, relatedClasses) {
  const classPattern = new RegExp(`(^|[^\\w-])\\.${escapeRegExp(primaryClass)}(?=[:\\s.#[>+~]|$)`);
  const relatedMatch = Array.from(relatedClasses).some((className) => {
    const pattern = new RegExp(`(^|[^\\w-])\\.${escapeRegExp(className)}(?=[:\\s.#[>+~]|$)`);
    return pattern.test(selector);
  });

  if (!classPattern.test(selector) && !relatedMatch) {
    return false;
  }

  if (selector.includes(".category-") || selector.includes(".button-card") || selector.includes(".copy-snippet-button")) {
    return false;
  }

  const otherButtonClasses = selector.match(/\.btn-[\w-]+/g) || [];
  return otherButtonClasses.every((className) =>
    relatedClasses.has(className.slice(1))
  );
}

function normalizeSelectorForExport(selector, primaryClass, exportTag, relatedClasses) {
  const normalized = selector
    .replace(/\.btn(?=[:\s.#[>+~]|$)/g, "")
    .replace(new RegExp(`\\.${escapeRegExp(primaryClass)}(?=[:\\s.#[>+~]|$)`, "g"), `.${primaryClass}`)
    .replace(/\s+/g, " ")
    .trim();

  const scoped = normalized.replace(
    new RegExp(`(^|[\\s>+~,(])\\.${escapeRegExp(primaryClass)}(?=[:\\s.#[>+~),]|$)`, "g"),
    `$1${exportTag}.${primaryClass}`
  );

  const hasPrimaryScope = new RegExp(`(^|[^\\w-])${escapeRegExp(exportTag)}\\.${escapeRegExp(primaryClass)}(?=[:\\s.#[>+~]|$)`).test(scoped);
  if (hasPrimaryScope) {
    return scoped;
  }

  const startsWithRelatedClass = Array.from(relatedClasses).some((className) => {
    const pattern = new RegExp(`(^|[\\s>+~,(])\\.${escapeRegExp(className)}(?=[:\\s.#[>+~),]|$)`);
    return pattern.test(scoped);
  });

  if (startsWithRelatedClass) {
    return `${exportTag}.${primaryClass} ${scoped}`;
  }

  return scoped;
}

function resolveStyleDeclaration(styleDeclaration) {
  return resolveCSSValue(styleDeclaration.cssText.trim());
}

function resolveCSSValue(value) {
  if (!value) return "";

  return value.replace(/var\((--[\w-]+)\)/g, (_, customProperty) => {
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(customProperty)
      .trim();
    return resolved || `var(${customProperty})`;
  });
}

function showCopySuccess(copyButton) {
  copyButton.classList.add("is-copied");
  copyButton.innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i>';
  window.setTimeout(() => {
    copyButton.classList.remove("is-copied");
    copyButton.innerHTML = '<i class="bi bi-copy" aria-hidden="true"></i>';
  }, 1400);
}

function showCopyFailure(copyButton) {
  copyButton.classList.add("is-copied");
  copyButton.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
  window.setTimeout(() => {
    copyButton.classList.remove("is-copied");
    copyButton.innerHTML = '<i class="bi bi-copy" aria-hidden="true"></i>';
  }, 1400);
}
