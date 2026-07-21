import { XMLParser } from "fast-xml-parser";

export interface TestCaseResult {
  id: string;
  name: string;
  classname: string;
  time: number;
  status: "passed" | "failed" | "error" | "skipped";
  message: string | null;
  type: string | null;
  details: string | null;
}

export interface TestReport {
  tests: number;
  passed: number;
  failures: number;
  errors: number;
  skipped: number;
  durationSec: number;
  cases: TestCaseResult[];
}

export function parseJUnitXml(xmlContent: string): TestReport {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsed = parser.parse(xmlContent);
  const testsuites = parsed.testsuites ?? parsed.testsuite;

  if (!testsuites) {
    return {
      tests: 0,
      passed: 0,
      failures: 0,
      errors: 0,
      skipped: 0,
      durationSec: 0,
      cases: [],
    };
  }

  const rawCases: any[] = [];
  const processSuite = (suite: any) => {
    if (suite.testcase) {
      if (Array.isArray(suite.testcase)) {
        rawCases.push(...suite.testcase);
      } else {
        rawCases.push(suite.testcase);
      }
    }
    if (suite.testsuite) {
      if (Array.isArray(suite.testsuite)) {
        suite.testsuite.forEach(processSuite);
      } else {
        processSuite(suite.testsuite);
      }
    }
  };

  if (Array.isArray(testsuites)) {
    testsuites.forEach(processSuite);
  } else {
    processSuite(testsuites);
  }

  let passed = 0;
  let failures = 0;
  let errors = 0;
  let skipped = 0;

  const cases: TestCaseResult[] = rawCases.map((c: any, index: number) => {
    const classname = c["@_classname"] ?? "unknown";
    const name = c["@_name"] ?? `test_${index}`;
    const time = parseFloat(c["@_time"] ?? "0");
    const id = `${classname}::${name}`;

    let status: TestCaseResult["status"] = "passed";
    let message: string | null = null;
    let type: string | null = null;
    let details: string | null = null;

    if (c.failure) {
      status = "failed";
      failures++;
      const f = Array.isArray(c.failure) ? c.failure[0] : c.failure;
      message = f["@_message"] ?? null;
      type = f["@_type"] ?? null;
      details = typeof f === "string" ? f : f["#text"] ?? null;
    } else if (c.error) {
      status = "error";
      errors++;
      const e = Array.isArray(c.error) ? c.error[0] : c.error;
      message = e["@_message"] ?? null;
      type = e["@_type"] ?? null;
      details = typeof e === "string" ? e : e["#text"] ?? null;
    } else if (c.skipped) {
      status = "skipped";
      skipped++;
    } else {
      passed++;
    }

    return { id, name, classname, time, status, message, type, details };
  });

  return {
    tests: cases.length,
    passed,
    failures,
    errors,
    skipped,
    durationSec: cases.reduce((acc, c) => acc + c.time, 0),
    cases,
  };
}
