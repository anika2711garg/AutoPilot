import { XMLParser, XMLValidator } from "fast-xml-parser";

/**
 * Structured pytest results. Code reads these verdicts; the model never squints
 * at raw logs. Downstream: the reproducer matches `type`/`message` against the
 * reported symptom; the verifier diffs `cases` against the baseline.
 */
export type TestStatus = "passed" | "failed" | "error" | "skipped";

export interface TestCaseResult {
  /** Derived identifier: `classname::name`, or just `name` when classname is empty. */
  id: string;
  name: string;
  classname: string;
  /** Wall-clock seconds for this case (0 when absent). */
  time: number;
  status: TestStatus;
  /** `@message` of the failure/error/skipped element, if any. */
  message: string | null;
  /** `@type` of the marker (often the exception class), if any. */
  type: string | null;
  /** Text body of the marker element (the traceback), if any. */
  details: string | null;
}

export interface TestReport {
  tests: number;
  passed: number;
  failures: number;
  errors: number;
  skipped: number;
  /** Sum of suite `@time` (falling back to the sum of case times). */
  durationSec: number;
  cases: TestCaseResult[];
}

/** Thrown when the input is not well-formed JUnit XML — never a silent bad parse. */
export class JUnitParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JUnitParseError";
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Keep everything as strings — a test named "123" must not become a number.
  parseAttributeValue: false,
  parseTagValue: false,
  textNodeName: "#text",
  trimValues: true,
  isArray: (name) => name === "testsuite" || name === "testcase",
});

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function strOrNull(v: unknown): string | null {
  if (typeof v === "string") return v.length > 0 ? v : null;
  if (typeof v === "number") return String(v);
  return null;
}

interface Marker {
  message: string | null;
  type: string | null;
  details: string | null;
}

/** A `<failure>`/`<error>`/`<skipped>` node may be a string (text only), an
 *  object (attributes ± text), or an empty element. Normalise all three. */
function readMarker(node: unknown): Marker {
  if (typeof node === "string") {
    return { message: null, type: null, details: node.length > 0 ? node : null };
  }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    return {
      message: strOrNull(o["@_message"]),
      type: strOrNull(o["@_type"]),
      details: strOrNull(o["#text"]),
    };
  }
  return { message: null, type: null, details: null };
}

type RawNode = Record<string, unknown>;

function parseCase(tc: RawNode): TestCaseResult {
  const classname = strOrNull(tc["@_classname"]) ?? "";
  const name = strOrNull(tc["@_name"]) ?? "";
  const time = toNum(tc["@_time"]);

  let status: TestStatus;
  let marker: Marker;
  // Precedence: error > failure > skipped > passed.
  if ("error" in tc) {
    status = "error";
    marker = readMarker(tc["error"]);
  } else if ("failure" in tc) {
    status = "failed";
    marker = readMarker(tc["failure"]);
  } else if ("skipped" in tc) {
    status = "skipped";
    marker = readMarker(tc["skipped"]);
  } else {
    status = "passed";
    marker = { message: null, type: null, details: null };
  }

  return {
    id: classname ? `${classname}::${name}` : name,
    name,
    classname,
    time,
    status,
    message: marker.message,
    type: marker.type,
    details: marker.details,
  };
}

export function parseJUnitXml(xml: string): TestReport {
  if (typeof xml !== "string" || xml.trim().length === 0) {
    throw new JUnitParseError("Empty JUnit XML input");
  }

  const valid = XMLValidator.validate(xml);
  if (valid !== true) {
    throw new JUnitParseError(`Malformed XML: ${valid.err.msg}`);
  }

  const doc = parser.parse(xml) as RawNode;

  // Accept either a <testsuites> wrapper or a bare <testsuite> root.
  let suites: RawNode[];
  const testsuites = doc["testsuites"] as RawNode | undefined;
  if (testsuites) {
    suites = Array.isArray(testsuites["testsuite"]) ? (testsuites["testsuite"] as RawNode[]) : [];
  } else if (Array.isArray(doc["testsuite"])) {
    suites = doc["testsuite"] as RawNode[];
  } else {
    throw new JUnitParseError("No <testsuite> element found");
  }

  const cases: TestCaseResult[] = [];
  let durationSec = 0;
  for (const suite of suites) {
    const rawCases = Array.isArray(suite["testcase"]) ? (suite["testcase"] as RawNode[]) : [];
    const parsed = rawCases.map(parseCase);
    cases.push(...parsed);
    durationSec +=
      "@_time" in suite ? toNum(suite["@_time"]) : parsed.reduce((s, c) => s + c.time, 0);
  }

  const count = (s: TestStatus) => cases.filter((c) => c.status === s).length;
  return {
    tests: cases.length,
    passed: count("passed"),
    failures: count("failed"),
    errors: count("error"),
    skipped: count("skipped"),
    durationSec,
    cases,
  };
}
