// Canonical field names (English): name, lastName, email, phone, idNumber, billingDate, plan, amount, balance
export const normalizeClientForTemplates = (client: Record<string, any>) => {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (client[k] !== undefined && client[k] !== null && client[k] !== '') return client[k];
    }
    return undefined;
  };

  const name = get('name', 'nombre', 'firstName') || '';
  const lastName = get('lastName', 'apellido', 'last_name') || '';
  const phone = get('phone', 'telefono', 'telefono_celular', 'phoneNumber') || '';
  const billingDate = get('billingDate', 'nextBillingDate', 'next_billing_date', 'dueDate', 'due_date') || '';
  const plan = get('plan') || '';
  const amount = get('amount', 'precio', 'price') || '';
  const balance = get('balance', 'debt') || '';
  const email = get('email') || '';
  const idNumber = get('idNumber', 'cedula', 'document') || '';

  return {
    ...client,
    name,
    lastName,
    phone,
    billingDate,
    plan,
    amount,
    balance,
    email,
    idNumber,
  } as Record<string, any>;
};

export default { normalizeClientForTemplates };
