const REQUEST_RULES = Object.freeze([
  {
    reason: 'This request may change sign-in, identity, permissions, security controls or secret handling.',
    pattern: /\b(?:auth(?:entication|orization)?|oauth|sign[ -]?(?:in|up)|signup|register|registration|account creation|identity provider|single sign[ -]?on|sso|login|password|session|access control|permissions?|roles?|security|secrets?|credentials?|api keys?|access tokens?|encryption|privacy boundary|multi[ -]?factor|mfa)\b/i,
  },
  {
    reason: 'This request may affect payments, billing, checkout or financial records.',
    pattern: /\b(?:payments?|billing|checkout|subscriptions?|invoices?|refunds?|financial records?)\b/i,
  },
  {
    reason: 'This request may delete or migrate stored data, alter a database schema, or change persistence.',
    pattern: /\b(?:database|schema migration|migrations?|data retention|persistent storage|drop table|truncate table|(?:delete|drop|wipe|reset|purge)\b.{0,60}\b(?:all|every|existing|production|database|user data|records|accounts|customer data)\b|wipe (?:the )?(?:database|data)|reset (?:the )?(?:database|production data))\b/i,
  },
  {
    reason: 'This request may change production deployment, infrastructure, or release behavior.',
    pattern: /\b(?:production deploy(?:ment)?|deploy\b.{0,40}\b(?:production|prod|vercel|cloud|hosted)|release pipeline|ci\/cd|deployment pipeline|infrastructure|terraform|cloud configuration|production environment)\b/i,
  },
  {
    reason: 'This request may replace project foundations or change dependencies and build tooling.',
    pattern: /\b(?:replace the (?:framework|database|stack)|rewrite the (?:whole|entire) (?:app|project|codebase)|migrate (?:the )?(?:framework|database|stack)|switch (?:the )?(?:framework|database|stack)|upgrade (?:all|major) dependencies|change (?:the )?package manager|(?:add|remove|update|upgrade|install|change)\b.{0,40}\b(?:dependencies|dependency|packages?|toolchain|build tool))\b/i,
  },
  {
    reason: 'This request may remove a large amount of existing work or affect production data.',
    pattern: /\b(?:delete|remove|erase|wipe|reset|purge)\b.{0,80}\b(?:all|every|entire|existing|production|database|user data|records|accounts|repository|codebase)\b/i,
  },
]);

const CRITICAL_PATH = /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.github\/workflows|api|server|backend|auth|authentication|oauth|login|session|middleware|security|permission|permissions|secret|secrets|credential|credentials|token|tokens|provider|webhook|billing|payment|checkout|migration|migrations|schema|database|db|deploy|deployment|infra|terraform|github-app|package\.json|(?:npm|pnpm|yarn|bun|cargo|go)\.lock|cargo\.toml|go\.mod|requirements(?:[-.][\w]+)?\.txt|pyproject\.toml|poetry\.lock|pipfile(?:\.lock)?|gemfile(?:\.lock)?|composer\.(?:json|lock)|pom\.xml|build\.gradle(?:\.kts)?|gradle\.lockfile|dockerfile|docker-compose(?:\.ya?ml)?|vercel\.json|next\.config\.[\w.]+)(?=$|[/.])/i;

export function criticalChangeReason(request) {
  const text = String(request || '').trim();
  if (!text) return '';
  return REQUEST_RULES.find((rule) => rule.pattern.test(text))?.reason || '';
}

export function criticalChangedPaths(changes) {
  if (!Array.isArray(changes)) return [];
  return [...new Set(changes
    .map((change) => String(change?.path || '').replaceAll('\\', '/'))
    .filter((path) => path && CRITICAL_PATH.test(path)))].slice(0, 12);
}

export function isClarifyingReply(reply) {
  const text = String(reply || '').trim();
  if (!text || text.length > 2400 || /```/.test(text)) return false;
  return /\b(?:before i (?:change|edit|proceed)|please confirm|could you clarify|could you confirm|would you like me to|do you want me to|are you comfortable|is it okay if|which (?:option|approach|database|framework)|should i (?:change|remove|replace|proceed|use)|i need your approval)\b/i.test(text);
}

export function isExplanationRequest(request) {
  const text = String(request || '').trim();
  if (!text) return false;
  const asksForEdit = /^(?:add|build|change|create|delete|edit|fix|implement|make|modify|remove|refactor|replace|update|write)\b/i.test(text)
    || /\b(?:and|then|also)\s+(?:add|build|change|create|delete|edit|fix|implement|make|modify|remove|refactor|replace|update|write)\b/i.test(text);
  return !asksForEdit && /^(?:explain|summari[sz]e|review|inspect|audit|describe|walk me through|what changed|what did you|why did you|how does|how do)\b/i.test(text);
}
