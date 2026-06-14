import { describe, expect, it } from 'vitest'
import { parseJunitXml } from './server'

describe('parseJunitXml', () => {
  it('parses passed and failed cases with suite and duration', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="auth" tests="2" failures="1" time="2.8" timestamp="2026-01-02T10:00:00">
    <testcase classname="auth.spec.ts" name="logs in" time="1.2" />
    <testcase classname="auth.spec.ts" name="rejects bad password" time="1.6">
      <failure message="Expected error banner">Assertion stack trace...</failure>
    </testcase>
  </testsuite>
</testsuites>`

    const results = parseJunitXml(xml)

    expect(results).toHaveLength(2)

    const passed = results.find((r) => r.name === 'logs in')
    expect(passed?.status).toBe('passed')
    expect(passed?.suite).toBe('auth.spec.ts')
    expect(passed?.durationMs).toBe(1200)

    const failed = results.find((r) => r.name === 'rejects bad password')
    expect(failed?.status).toBe('failed')
    expect(failed?.durationMs).toBe(1600)
    expect(failed?.errorMessage).toBe('Expected error banner')
    expect(failed?.startedAt).toBe('2026-01-02T10:00:00')
  })

  it('detects skipped cases', () => {
    const xml = `<testsuite name="s">
      <testcase classname="s" name="todo"><skipped /></testcase>
    </testsuite>`

    const [result] = parseJunitXml(xml)
    expect(result.status).toBe('skipped')
  })

  it('treats <error> as failed', () => {
    const xml = `<testsuite name="s">
      <testcase classname="s" name="boom"><error message="crash">trace</error></testcase>
    </testsuite>`

    const [result] = parseJunitXml(xml)
    expect(result.status).toBe('failed')
    expect(result.errorMessage).toBe('crash')
  })

  it('handles self-closing testcases as passed', () => {
    const xml = `<testsuite name="s">
      <testcase classname="s" name="quick check" time="0.5" />
    </testsuite>`

    const [result] = parseJunitXml(xml)
    expect(result.status).toBe('passed')
    expect(result.durationMs).toBe(500)
  })

  it('extracts a TMS case key and manual test id from the name', () => {
    const xml = `<testsuite name="s">
      <testcase classname="s" name="Login succeeds TMS-142" time="0.1" />
    </testsuite>`

    const [result] = parseJunitXml(xml)
    expect(result.caseKey).toBe('TMS-142')
    expect(result.manualTestId).toBe(142)
  })

  it('collects attachments from properties and stdout markers, de-duplicated', () => {
    const xml = `<testsuite name="s">
      <testcase classname="s" name="with artifacts">
        <properties>
          <property name="screenshot" value="https://ci.example.com/shot.png" />
        </properties>
        <system-out>[[ATTACHMENT|https://ci.example.com/trace.zip]]</system-out>
        <failure message="boom">stack</failure>
      </testcase>
    </testsuite>`

    const [result] = parseJunitXml(xml)
    const urls = result.attachments.map((a) => a.url).sort()
    expect(urls).toEqual([
      'https://ci.example.com/shot.png',
      'https://ci.example.com/trace.zip',
    ])
    const screenshot = result.attachments.find((a) =>
      a.url.endsWith('.png'),
    )
    expect(screenshot?.type).toBe('screenshot')
  })

  it('parses multiple suites', () => {
    const xml = `<testsuites>
      <testsuite name="a"><testcase classname="a" name="t1" /></testsuite>
      <testsuite name="b"><testcase classname="b" name="t2" /></testsuite>
    </testsuites>`

    const results = parseJunitXml(xml)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.suite).sort()).toEqual(['a', 'b'])
  })

  it('decodes CDATA and entities in failure text', () => {
    const xml = `<testsuite name="s">
      <testcase classname="s" name="x">
        <failure><![CDATA[expected <b>5</b> & got 4]]></failure>
      </testcase>
    </testsuite>`

    const [result] = parseJunitXml(xml)
    expect(result.stackTrace).toContain('expected')
    expect(result.stackTrace).toContain('&')
  })
})
