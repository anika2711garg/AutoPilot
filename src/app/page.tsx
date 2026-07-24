"use client";

import React, { useState } from "react";
import {
  Terminal,
  GitPullRequest,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Play,
  Flame,
  FolderCode,
  FileText,
  Lock,
  Layers,
  ArrowRight,
  RefreshCw,
  XCircle,
  ExternalLink,
  Sparkles,
  Check,
  Code2,
} from "lucide-react";

export default function Dashboard() {
  const [repoOwner, setRepoOwner] = useState("anika2711garg");
  const [repoName, setRepoName] = useState("AutoPilot");
  const [issueNumber, setIssueNumber] = useState(42);
  const [mode, setMode] = useState<"strict" | "permissive">("strict");
  const [budgetUsd, setBudgetUsd] = useState(10);
  const [activeTab, setActiveTab] = useState<"pipeline" | "evaluations" | "mcp">("pipeline");

  const [currentRun, setCurrentRun] = useState<any>({
    id: 1,
    state: "awaiting_human",
    mode: "strict",
    dollarBudgetUsd: 10,
    totalCostUsd: 0.12,
    repoOwner: "anika2711garg",
    repoName: "AutoPilot",
    issueNumber: 42,
    patchDigest: "e2e_84f29a0b1c7d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    reproDigest: "repro_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [prCreated, setPrCreated] = useState<any>(null);

  const stages = [
    { key: "created", label: "Created" },
    { key: "ingesting", label: "Ingest" },
    { key: "localizing", label: "Localize" },
    { key: "reproducing", label: "Reproduce" },
    { key: "patching", label: "Patch" },
    { key: "verifying", label: "Verify" },
    { key: "awaiting_human", label: "Human Gate" },
    { key: "opening_pr", label: "Opening PR" },
    { key: "done", label: "Done" },
  ];

  const getCurrentStageIndex = () => {
    const idx = stages.findIndex((s) => s.key === currentRun.state);
    return idx >= 0 ? idx : 6;
  };

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner,
          repoName,
          issueNumber,
          mode,
          dollarBudgetUsd: budgetUsd,
        }),
      });
      const data = await res.json();
      setCurrentRun(data);
      setApprovalStatus("pending");
      setPrCreated(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await fetch(`/api/v1/runs/${currentRun.id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedBy: "security_lead@dig-ai.org",
          approvedPatchDigest: currentRun.patchDigest,
          approvedReproductionDigest: currentRun.reproDigest,
        }),
      });
      if (res.ok) {
        setApprovalStatus("approved");
        setCurrentRun((prev: any) => ({ ...prev, state: "opening_pr" }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    try {
      const res = await fetch(`/api/v1/runs/${currentRun.id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", approvedBy: "security_lead@dig-ai.org" }),
      });
      if (res.ok) {
        setApprovalStatus("rejected");
        setCurrentRun((prev: any) => ({ ...prev, state: "failed" }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePR = async () => {
    try {
      const res = await fetch(`/api/v1/runs/${currentRun.id}/pull-request`, {
        method: "POST",
      });
      const data = await res.json();
      setPrCreated(data);
      setCurrentRun((prev: any) => ({ ...prev, state: "done" }));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center">
              DIG AI <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Pinterest Edition</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Autonomous Issue-to-PR Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping" />
            Fullstack Active
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Mock Writes Mode
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
        {/* Navigation Pills */}
        <div className="flex space-x-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs w-fit">
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 ${
              activeTab === "pipeline"
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Workflow Pipeline</span>
          </button>
          <button
            onClick={() => setActiveTab("evaluations")}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 ${
              activeTab === "evaluations"
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Benchmark Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 ${
              activeTab === "mcp"
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>MCP Tools API</span>
          </button>
        </div>

        {activeTab === "pipeline" && (
          <div className="space-y-8">
            {/* Run Trigger Form */}
            <div className="pinterest-card p-8">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Launch Issue Fix Pipeline</h2>
              </div>
              <form onSubmit={handleStartRun} className="grid grid-cols-1 md:grid-cols-5 gap-5 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Repo Owner</label>
                  <input
                    type="text"
                    value={repoOwner}
                    onChange={(e) => setRepoOwner(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Repo Name</label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Issue #</label>
                  <input
                    type="number"
                    value={issueNumber}
                    onChange={(e) => setIssueNumber(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Strictness Mode</label>
                  <select
                    value={mode}
                    onChange={(e: any) => setMode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                  >
                    <option value="strict">Strict (Fail on Weak Repro)</option>
                    <option value="permissive">Permissive (Log Warning)</option>
                  </select>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Start Fix</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Stepper Card */}
            <div className="pinterest-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-md font-bold text-slate-900 flex items-center">
                    Pipeline Execution Progress
                    <span className="ml-2 text-xs font-extrabold px-3 py-1 rounded-full bg-rose-100 text-rose-700">
                      Run #{currentRun.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {currentRun.repoOwner}/{currentRun.repoName} — Issue #{currentRun.issueNumber}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    Budget Spend: <span className="text-emerald-600 font-mono">${currentRun.totalCostUsd}</span> / ${currentRun.dollarBudgetUsd}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                    {currentRun.state}
                  </span>
                </div>
              </div>

              {/* Progress Bar Stepper */}
              <div className="grid grid-cols-9 gap-3 relative">
                {stages.map((st, i) => {
                  const currentIdx = getCurrentStageIndex();
                  const isPassed = i < currentIdx;
                  const isCurrent = i === currentIdx;

                  return (
                    <div key={st.key} className="flex flex-col items-center text-center space-y-2">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all ${
                          isPassed
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : isCurrent
                            ? "bg-rose-600 text-white glow-active-light ring-4 ring-rose-100 shadow-lg shadow-rose-500/30"
                            : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}
                      >
                        {isPassed ? <Check className="w-5 h-5 stroke-[3]" /> : i + 1}
                      </div>
                      <span
                        className={`text-[11px] font-bold tracking-tight ${
                          isCurrent ? "text-rose-600" : isPassed ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stages Detail Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Ingestion & Localization */}
              <div className="pinterest-card p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2.5 text-rose-600 font-bold">
                    <div className="p-2 bg-rose-50 rounded-xl">
                      <FolderCode className="w-5 h-5" />
                    </div>
                    <span>1. Ingestion & Localization</span>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Confidence: 95%
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Problem Summary</span>
                    <p className="mt-1 text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-medium leading-relaxed">
                      Off-by-one arithmetic error in addition routine when adding two positive integers.
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Extracted Stack Trace Location</span>
                    <div className="mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-rose-600 font-mono font-bold">calculator.py:5</span>
                      <span className="text-xs text-slate-500 font-medium">add(a, b)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-bold text-[11px]">Prompt Injection Screening:</span>
                    <span className="text-emerald-600 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Clear (Score: 0.0)
                    </span>
                  </div>
                </div>
              </div>

              {/* Reproduction Test */}
              <div className="pinterest-card p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2.5 text-purple-600 font-bold">
                    <div className="p-2 bg-purple-50 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span>2. Reproduction Test</span>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    🟢 STRONG
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Generated Pytest Code</span>
                  <pre className="bg-slate-900 p-4 rounded-xl text-teal-300 font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner">
{`from calculator import add

def test_add_bug():
    assert add(2, 3) == 5`}
                  </pre>
                  <div className="flex items-center justify-between bg-rose-50 p-3 rounded-xl border border-rose-200">
                    <span className="text-rose-900 font-bold">Pre-patch Execution:</span>
                    <span className="text-rose-700 font-extrabold flex items-center">
                      <XCircle className="w-4 h-4 mr-1" />
                      Failed as expected (exitCode 1)
                    </span>
                  </div>
                </div>
              </div>

              {/* Patch & Verification */}
              <div className="pinterest-card p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2.5 text-teal-600 font-bold">
                    <div className="p-2 bg-teal-50 rounded-xl">
                      <Code2 className="w-5 h-5" />
                    </div>
                    <span>3. Patch & Verification</span>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    SHA256 Verified
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Git Code Patch Diff</span>
                  <div className="bg-slate-900 p-4 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto shadow-inner">
                    <div className="text-slate-400">--- a/calculator.py</div>
                    <div className="text-slate-400">+++ b/calculator.py</div>
                    <div className="text-rose-400 bg-rose-950/40 px-1 py-0.5 rounded">- return a + b - 1</div>
                    <div className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded">+ return a + b</div>
                  </div>
                  <div className="space-y-2 pt-1 font-semibold text-xs">
                    <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-emerald-900">Post-patch Test Run:</span>
                      <span className="text-emerald-700 font-extrabold">✅ Passed</span>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-emerald-900">Revert Check:</span>
                      <span className="text-emerald-700 font-extrabold">✅ Passed (Fails on original)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Human Approval Gate */}
              <div className="pinterest-card p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2.5 text-amber-600 font-bold">
                    <div className="p-2 bg-amber-50 rounded-xl">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span>4. Human Approval Gate</span>
                  </div>
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                      approvalStatus === "approved"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : approvalStatus === "rejected"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {approvalStatus.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 font-mono text-[10px] break-all">
                    <span className="text-slate-500 font-bold block font-sans text-xs mb-1">Bound Patch Digest (SHA-256):</span>
                    <span className="text-rose-600 font-bold">{currentRun.patchDigest}</span>
                  </div>

                  {approvalStatus === "pending" && (
                    <div className="flex space-x-3 pt-1">
                      <button
                        onClick={handleApprove}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Run</span>
                      </button>
                      <button
                        onClick={handleReject}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {approvalStatus === "approved" && !prCreated && (
                    <button
                      onClick={handleCreatePR}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-rose-600/20 hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                    >
                      <GitPullRequest className="w-5 h-5" />
                      <span>Submit Draft Pull Request</span>
                    </button>
                  )}

                  {prCreated && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between font-bold text-emerald-900">
                        <span className="flex items-center">
                          <GitPullRequest className="w-4 h-4 mr-2 text-emerald-600" />
                          Draft PR Created (Idempotent)
                        </span>
                        <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-xs">
                          #{prCreated.externalPrNumber}
                        </span>
                      </div>
                      <a
                        href={prCreated.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center font-mono hover:underline"
                      >
                        {prCreated.url}
                        <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "evaluations" && (
          <div className="pinterest-card p-8 space-y-6">
            <h2 className="text-lg font-bold flex items-center text-slate-900">
              <Flame className="w-5 h-5 text-rose-600 mr-2" />
              Benchmark & Evaluation Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolution Rate</span>
                <p className="text-3xl font-extrabold text-emerald-600 mt-2">83.3%</p>
                <span className="text-xs text-slate-400 font-medium">10 of 12 benchmark runs</span>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Cost / Task</span>
                <p className="text-3xl font-extrabold text-rose-600 mt-2">$0.14</p>
                <span className="text-xs text-slate-400 font-medium">Budget ceiling: $10.00</span>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Latency</span>
                <p className="text-3xl font-extrabold text-purple-600 mt-2">42.5s</p>
                <span className="text-xs text-slate-400 font-medium">End-to-end execution</span>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repro Test Rate</span>
                <p className="text-3xl font-extrabold text-teal-600 mt-2">91.6%</p>
                <span className="text-xs text-slate-400 font-medium">🟢 Strong confidence</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "mcp" && (
          <div className="pinterest-card p-8 space-y-6">
            <h2 className="text-lg font-bold flex items-center text-slate-900">
              <Terminal className="w-5 h-5 text-rose-600 mr-2" />
              Exposed MCP Tools API
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { name: "get_issue", desc: "Fetch issue data without leaking credentials" },
                { name: "search_code", desc: "Search repository code with path limits" },
                { name: "read_file", desc: "Read files with strict path confinement" },
                { name: "run_tests", desc: "Run test suite in network-off sandbox" },
                { name: "approve_run", desc: "Record human approval with digest binding" },
                { name: "open_pull_request", desc: "Create idempotent draft PR with kill switch" },
              ].map((t) => (
                <div key={t.name} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-start space-x-3">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-xl mt-0.5">
                    <CodeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-mono text-sm font-bold text-rose-600">{t.name}</span>
                    <p className="text-xs text-slate-600 mt-1 font-medium">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CodeIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}
