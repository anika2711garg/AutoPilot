import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { JUnitParseError, parseJUnitXml, type TestCaseResult } from "./junit";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "junit");
const fixture = (name: string) => readFileSync(join(fixturesDir, name), "utf8");

const byName = (cases: TestCaseResult[], name: string) => {
  const c = cases.find((x) => x.name === name);
  if (!c) throw new Error(`no case named ${name}`);
  return c;
};

describe("parseJUnitXml — all passing", () => {
  const report = parseJUnitXml(fixture("all_passing.xml"));

  it("counts every case as passed", () => {
    expect(report).toMatchObject({ tests: 2, passed: 2, failures: 0, errors: 0, skipped: 0 });
  });

  it("uses suite @time for duration", () => {
    expect(report.durationSec).toBeCloseTo(0.012);
  });

  it("derives classname::name ids", () => {
    expect(report.cases[0]!.id).toBe("tests.test_math::test_add");
    expect(report.cases[0]!.status).toBe("passed");
  });
});

describe("parseJUnitXml — mixed outcomes", () => {
  const report = parseJUnitXml(fixture("mixed.xml"));

  it("classifies each status correctly", () => {
    expect(report).toMatchObject({ tests: 4, passed: 1, failures: 1, errors: 1, skipped: 1 });
  });

  it("captures failure message, type, and traceback body", () => {
    const f = byName(report.cases, "test_repro");
    expect(f.status).toBe("failed");
    expect(f.type).toBe("AssertionError");
    expect(f.message).toBe("assert 3 == 2");
    expect(f.details).toContain("assert 3 == 2");
    // XML entity in the fixture is unescaped by the parser.
    expect(f.details).toContain(">       assert add(1, 1) == 2");
  });

  it("captures an errored (collection/import) case distinctly from a failure", () => {
    const e = byName(report.cases, "test_import");
    expect(e.status).toBe("error");
    expect(e.type).toBe("ImportError");
    expect(e.message).toBe("cannot import name 'foo'");
  });

  it("captures a skip with its reason", () => {
    const s = byName(report.cases, "test_slow");
    expect(s.status).toBe("skipped");
    expect(s.message).toBe("needs network");
  });
});

describe("parseJUnitXml — XML shape variants", () => {
  it("accepts a bare <testsuite> root (older pytest)", () => {
    const report = parseJUnitXml(fixture("single_suite.xml"));
    expect(report).toMatchObject({ tests: 1, failures: 1 });
    expect(report.cases[0]!.details).toContain("ValueError: boom");
  });

  it("aggregates across multiple <testsuite> elements", () => {
    const report = parseJUnitXml(fixture("multi_suite.xml"));
    expect(report).toMatchObject({ tests: 2, passed: 1, failures: 1 });
    expect(report.durationSec).toBeCloseTo(0.03);
  });

  it("handles an empty suite (0 tests) without error", () => {
    const report = parseJUnitXml(fixture("empty.xml"));
    expect(report).toMatchObject({ tests: 0, passed: 0, failures: 0 });
    expect(report.cases).toEqual([]);
  });
});

describe("parseJUnitXml — edge cases", () => {
  it("treats a self-closing failure with only @message as failed, details null", () => {
    const xml = `<testsuite tests="1"><testcase classname="c" name="n" time="0.1"><failure message="boom"/></testcase></testsuite>`;
    const c = parseJUnitXml(xml).cases[0]!;
    expect(c.status).toBe("failed");
    expect(c.message).toBe("boom");
    expect(c.details).toBeNull();
  });

  it("defaults a missing time attribute to 0", () => {
    const xml = `<testsuite tests="1"><testcase classname="c" name="n"/></testsuite>`;
    expect(parseJUnitXml(xml).cases[0]!.time).toBe(0);
  });

  it("keeps a numeric-looking test name as a string", () => {
    const xml = `<testsuite tests="1"><testcase classname="c" name="123" time="0"/></testsuite>`;
    expect(parseJUnitXml(xml).cases[0]!.name).toBe("123");
  });

  it("gives precedence to error over failure when both are present", () => {
    const xml = `<testsuite tests="1"><testcase classname="c" name="n"><error message="e"/><failure message="f"/></testcase></testsuite>`;
    expect(parseJUnitXml(xml).cases[0]!.status).toBe("error");
  });
});

describe("parseJUnitXml — rejects bad input", () => {
  it("throws JUnitParseError on empty input", () => {
    expect(() => parseJUnitXml("")).toThrow(JUnitParseError);
    expect(() => parseJUnitXml("   ")).toThrow(JUnitParseError);
  });

  it("throws JUnitParseError on malformed XML", () => {
    expect(() => parseJUnitXml("<testsuites><testsuite>")).toThrow(JUnitParseError);
  });

  it("throws JUnitParseError when there is no <testsuite>", () => {
    expect(() => parseJUnitXml("<foo/>")).toThrow(/No <testsuite>/);
  });
});
