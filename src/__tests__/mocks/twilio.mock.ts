type MatchRule = {
  toContains?: string;
  contentSid?: string;
  templateName?: string;
  // other simple matchers can be added
  response: { type: 'resolve' | 'reject'; value: any };
};

const calls: any[] = [];
let rules: MatchRule[] = [];
let defaultResponse: { type: 'resolve' | 'reject'; value: any } = { type: 'resolve', value: { sid: 'SM123' } };

function matchPayload(payload: any, rule: MatchRule) {
  if (rule.toContains && !(payload.to || '').includes(rule.toContains)) return false;
  if (rule.contentSid && payload.contentSid !== rule.contentSid) return false;
  // content template name may be nested in payload.content[0].template.name
  if (rule.templateName) {
    const pname = payload?.content?.[0]?.template?.name;
    if (pname !== rule.templateName) return false;
  }
  return true;
}

async function create(payload: any) {
  calls.push(payload);
  // Find first matching rule
  for (const r of rules) {
    if (matchPayload(payload, r)) {
      if (r.response.type === 'resolve') return r.response.value;
      throw r.response.value;
    }
  }
  // default
  if (defaultResponse.type === 'resolve') return defaultResponse.value;
  throw defaultResponse.value;
}

function __reset() {
  calls.length = 0;
  rules = [];
  defaultResponse = { type: 'resolve', value: { sid: 'SM123' } };
}

function __addRule(rule: MatchRule) {
  rules.push(rule);
}

function __setDefaultResponse(resp: { type: 'resolve' | 'reject'; value: any }) {
  defaultResponse = resp;
}

function __getCalls() {
  return calls.slice();
}

module.exports = { messages: { create }, __reset, __addRule, __setDefaultResponse, __getCalls };
