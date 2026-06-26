export type AuditStatus = "breach" | "warning" | "pass";

export type SourceDoc = {
  title: string;
  url: string;
  snippet: string;
};

export type ReasoningStep = {
  fact: string;
  value: string;
};

export type Finding = {
  rule: string;
  finding: string;
  status: AuditStatus;
  evidence: string;
  source: string;
  engine: "claude" | "relationship";
  reasoningChain?: ReasoningStep[];
};

export type PipelineStep = {
  id: "ground" | "judge" | "report" | "leaderboard";
  label: string;
  detail: string;
  status: "pending" | "running" | "done";
};

export type LeaderboardEntry = {
  target: string;
  breach_count: number;
  warning_count: number;
  audit_count: number;
  last_audited: string;
};

export type AuditResponse = {
  target: string;
  findings: Finding[];
  sources: {
    euAiAct: SourceDoc[];
    ukServiceStandard: SourceDoc[];
    privacyNotice: SourceDoc[];
  };
  pipeline: PipelineStep[];
  leaderboardLogged: boolean;
};
