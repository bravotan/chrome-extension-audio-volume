// Domain/path rule matching shared by background, popup, options and content scripts.
// Loaded as a plain classic script everywhere (content scripts can't use ES modules
// without a bundler), so it attaches its API to a shared global namespace instead.
//
// A rule: { id, pattern, scope: "domain" | "path", path, volume, muted, createdAt, updatedAt }
// pattern examples: "youtube.com", "*.spotify.com" (scope "domain"), "example.com" with
// path "/docs" (scope "path").
(function (global) {
  const SCOPE_DOMAIN = "domain";
  const SCOPE_PATH = "path";

  const DEFAULT_VOLUME = 100;
  const MIN_VOLUME = 0;
  const MAX_VOLUME = 100;

  function clampVolume(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return DEFAULT_VOLUME;
    return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(n)));
  }

  function normalizeDomain(input) {
    let value = String(input || "").trim().toLowerCase();
    value = value.replace(/^\*\./, "");
    value = value.replace(/^https?:\/\//, "");
    value = value.split("/")[0];
    return value;
  }

  // Returns { host, path } for a page URL, or null if the URL can't carry rules
  // (chrome://, about:, extension pages, etc).
  function parseTargetUrl(urlString) {
    try {
      const url = new URL(urlString);
      if (!/^https?:$/.test(url.protocol)) return null;
      return { host: url.hostname.toLowerCase(), path: url.pathname || "/" };
    } catch {
      return null;
    }
  }

  function domainMatches(pattern, host) {
    const isWildcard = pattern.startsWith("*.");
    const base = normalizeDomain(pattern);
    if (isWildcard) {
      return host === base || host.endsWith("." + base);
    }
    return host === base;
  }

  function pathMatches(rulePath, actualPath) {
    const normalizedRule = rulePath.endsWith("/") && rulePath.length > 1 ? rulePath.slice(0, -1) : rulePath;
    const normalizedActual = actualPath.endsWith("/") && actualPath.length > 1 ? actualPath.slice(0, -1) : actualPath;
    return normalizedRule === normalizedActual || normalizedActual.startsWith(normalizedRule + "/");
  }

  function ruleMatchesTarget(rule, host, path) {
    if (!domainMatches(rule.pattern, host)) return false;
    if (rule.scope === SCOPE_PATH) {
      return pathMatches(rule.path || "/", path);
    }
    return true;
  }

  function specificity(rule) {
    let score = 0;
    if (rule.scope === SCOPE_PATH) score += 1000 + (rule.path || "").length;
    if (!rule.pattern.startsWith("*.")) score += 500;
    score += rule.pattern.length;
    return score;
  }

  // Picks the single best-matching rule for a host/path, most specific wins.
  function findBestRule(rules, host, path) {
    const matches = rules.filter((r) => ruleMatchesTarget(r, host, path));
    if (matches.length === 0) return null;
    matches.sort((a, b) => specificity(b) - specificity(a));
    return matches[0];
  }

  function sortRulesForDisplay(rules) {
    return [...rules].sort((a, b) => {
      const domainCmp = normalizeDomain(a.pattern).localeCompare(normalizeDomain(b.pattern));
      if (domainCmp !== 0) return domainCmp;
      return specificity(b) - specificity(a);
    });
  }

  function createRuleId() {
    return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  global.VolumeDomain = global.VolumeDomain || {};
  global.VolumeDomain.rules = {
    SCOPE_DOMAIN,
    SCOPE_PATH,
    DEFAULT_VOLUME,
    MIN_VOLUME,
    MAX_VOLUME,
    clampVolume,
    normalizeDomain,
    parseTargetUrl,
    ruleMatchesTarget,
    findBestRule,
    sortRulesForDisplay,
    createRuleId,
  };
})(typeof self !== "undefined" ? self : this);
