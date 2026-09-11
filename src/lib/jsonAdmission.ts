export interface VeilResourcePolicy {
  maxDocumentBytes: number
  maxNestingDepth: number
  maxItems: number
  maxStringLength: number
}

export type VeilResourcePolicyOverride = Partial<VeilResourcePolicy>

export const DEFAULT_VEIL_RESOURCE_POLICY: VeilResourcePolicy = {
  maxDocumentBytes: 16 * 1024 * 1024,
  maxNestingDepth: 64,
  maxItems: 100_000,
  maxStringLength: 1_000_000
}

export type JsonAdmissionResult =
  | { ok: true; value: unknown }
  | { ok: false; kind: 'invalid' | 'duplicate' | 'limit'; message: string }

function policyWithDefaults(override?: VeilResourcePolicyOverride): VeilResourcePolicy {
  return { ...DEFAULT_VEIL_RESOURCE_POLICY, ...override }
}

function scanValue(value: unknown, policy: VeilResourcePolicy, depth = 0): string | null {
  if (depth > policy.maxNestingDepth) return 'Maximum nesting depth exceeded'
  if (typeof value === 'string' && value.length > policy.maxStringLength) {
    return 'Maximum string length exceeded'
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const failure = scanValue(entry, policy, depth + 1)
      if (failure) return failure
    }
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key.length > policy.maxStringLength) return 'Maximum string length exceeded'
      const failure = scanValue(entry, policy, depth + 1)
      if (failure) return failure
    }
  }
  return null
}

/** Duplicate-aware JSON scanner. It tokenizes strings/containers and never interprets VEIL data. */
function findDuplicateMember(text: string): string | null {
  let index = 0
  const whitespace = (): void => { while (/\s/.test(text[index] ?? '')) index += 1 }
  const stringToken = (): string => {
    if (text[index] !== '"') throw new Error('Expected string')
    const start = index
    index += 1
    while (index < text.length) {
      if (text[index] === '\\') { index += 2; continue }
      if (text[index] === '"') {
        index += 1
        return JSON.parse(text.slice(start, index)) as string
      }
      index += 1
    }
    throw new Error('Unterminated string')
  }
  const primitive = (): void => {
    const start = index
    while (index < text.length && !/[\s,\]}]/.test(text[index])) index += 1
    if (start === index) throw new Error('Expected value')
  }
  const value = (): string | null => {
    whitespace()
    if (text[index] === '"') { stringToken(); return null }
    if (text[index] === '[') {
      index += 1; whitespace()
      if (text[index] === ']') { index += 1; return null }
      while (true) {
        const duplicate = value(); if (duplicate) return duplicate
        whitespace()
        if (text[index] === ']') { index += 1; return null }
        if (text[index] !== ',') throw new Error('Expected comma')
        index += 1
      }
    }
    if (text[index] === '{') {
      index += 1; whitespace()
      const keys = new Set<string>()
      if (text[index] === '}') { index += 1; return null }
      while (true) {
        whitespace(); const key = stringToken(); whitespace()
        if (keys.has(key)) return key
        keys.add(key)
        if (text[index] !== ':') throw new Error('Expected colon')
        index += 1
        const duplicate = value(); if (duplicate) return duplicate
        whitespace()
        if (text[index] === '}') { index += 1; return null }
        if (text[index] !== ',') throw new Error('Expected comma')
        index += 1
      }
    }
    primitive(); return null
  }
  const duplicate = value(); whitespace()
  if (index !== text.length) throw new Error('Trailing content')
  return duplicate
}

export function admitVeilJson(
  text: string,
  override?: VeilResourcePolicyOverride
): JsonAdmissionResult {
  const policy = policyWithDefaults(override)
  if (new TextEncoder().encode(text).byteLength > policy.maxDocumentBytes) {
    return { ok: false, kind: 'limit', message: 'Maximum document size exceeded' }
  }
  try {
    const duplicate = findDuplicateMember(text)
    if (duplicate !== null) {
      return { ok: false, kind: 'duplicate', message: `Duplicate JSON member: ${duplicate}` }
    }
  } catch {
    return { ok: false, kind: 'invalid', message: 'File is not valid JSON' }
  }
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch {
    return { ok: false, kind: 'invalid', message: 'File is not valid JSON' }
  }
  const limitFailure = scanValue(parsed, policy)
  if (limitFailure) return { ok: false, kind: 'limit', message: limitFailure }
  if (
    parsed && typeof parsed === 'object' &&
    Array.isArray((parsed as { items?: unknown }).items) &&
    (parsed as { items: unknown[] }).items.length > policy.maxItems
  ) {
    return { ok: false, kind: 'limit', message: 'Maximum item count exceeded' }
  }
  return { ok: true, value: parsed }
}

export function checkVeilObjectLimits(
  value: unknown,
  override?: VeilResourcePolicyOverride
): string | null {
  const policy = policyWithDefaults(override)
  const limitFailure = scanValue(value, policy)
  if (limitFailure) return limitFailure
  if (
    value && typeof value === 'object' &&
    Array.isArray((value as { items?: unknown }).items) &&
    (value as { items: unknown[] }).items.length > policy.maxItems
  ) return 'Maximum item count exceeded'
  return null
}
