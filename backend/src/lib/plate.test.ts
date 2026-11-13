import { describe, expect, test } from 'bun:test'
import { bikePlate, fullName, normaliseBikePlate } from './plate'

describe('normaliseBikePlate', () => {
  test('accepts any spacing and case', () => {
    expect(normaliseBikePlate('KMFB 412X')).toBe('KMFB 412X')
    expect(normaliseBikePlate('kmfb412x')).toBe('KMFB 412X')
    expect(normaliseBikePlate(' KM-FB 412 X ')).toBe('KMFB 412X')
  })
  test('rejects car plates and junk', () => {
    expect(normaliseBikePlate('KDA 123A')).toBeNull()
    expect(normaliseBikePlate('KMFB 41X')).toBeNull()
    expect(normaliseBikePlate('')).toBeNull()
  })
  test('schema transforms', () => {
    expect(bikePlate.parse('kmdq315m')).toBe('KMDQ 315M')
    expect(bikePlate.safeParse('nope').success).toBe(false)
  })
})

describe('fullName', () => {
  test('needs two names and collapses spaces', () => {
    expect(fullName.parse('  Brian   Otieno ')).toBe('Brian Otieno')
    expect(fullName.safeParse('Brian').success).toBe(false)
  })
})
