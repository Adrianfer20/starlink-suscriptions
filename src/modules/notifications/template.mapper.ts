// Using a loose client shape here; normalizer provides canonical fields.

/**
 * Mapper that returns template SID and ordered parameters array for supported templates.
 * Extend this file when new templates are added.
 */
export type TemplateInfo = {
  templateSid?: string;
  templateName?: string;
  language?: string;
  // list of client document fields required to build params (used for validation)
  requiredFields?: string[];
  buildParams: (client: Record<string, any>) => string[];
};

export const templates: Record<string, TemplateInfo> = {
  subscription_reminder_3days: {
    templateSid: 'HX5087e5a665544471a058eec56fb37431',
    language: 'es',
    requiredFields: ['name','billingDate','plan','amount','phone'],
    buildParams: (client) => {
      const nombre = client.name ? `${client.name}${client.lastName ? ' ' + client.lastName : ''}` : 'Cliente';
      const plan = (client as any).plan || 'Plan Mensual';
      const billingDate = client.billingDate || '';
      const amount = (client as any).amount || '$50';
      return [nombre, plan, billingDate, amount];
    }
  }
  ,
  subscription_cutoff_day: {
    templateSid: 'HX161c1caf98ea4a08e94e5a92a23d4203',
    language: 'es',
    // `balance` is not strictly required to notify the cutoff day; allow send when missing
    requiredFields: ['name','billingDate','plan','amount','phone'],
    buildParams: (client) => {
      const nombre = client.name ? `${client.name}${client.lastName ? ' ' + client.lastName : ''}` : 'Cliente';
      const cutoffDate = client.billingDate || '';
      const plan = (client as any).plan || 'Plan Mensual';
      const amount = (client as any).amount || '$50';
      const debt = (client as any).balance || (client as any).debt || '$0';
      return [nombre, cutoffDate, plan, amount, debt];
    }
  }
  ,
  subscription_suspended_notice: {
    templateSid: 'HX1e01bf6da9e13d7b4ba90a78a9c1fdad',
    language: 'es',
    requiredFields: ['name','plan','phone'],
    buildParams: (client) => {
      const nombre = client.name ? `${client.name}${client.lastName ? ' ' + client.lastName : ''}` : 'Cliente';
      const plan = (client as any).plan || 'Plan Mensual';
      return [nombre, plan];
    }
  }
};

export default templates;
