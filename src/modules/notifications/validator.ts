import templates from './template.mapper';
import { normalizeClientForTemplates } from './client.normalizer';

export const validateClientForTemplate = (templateKey: string, client: Record<string, any>) => {
  const tpl = templates[templateKey];
  if (!tpl) return { ok: false, missing: ['template_not_found'] };

  // Normalize client so we accept multiple field names from Firestore and expose canonical English keys.
  const normalized = normalizeClientForTemplates(client || {});

  const required = tpl.requiredFields || [];
  const missing: string[] = [];

  for (const f of required) {
    // treat falsy empty string or undefined as missing
    if (normalized[f] === undefined || normalized[f] === null || normalized[f] === '') missing.push(f);
  }

  return { ok: missing.length === 0, missing };
};

export default { validateClientForTemplate };
