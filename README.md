# Sentinel - public-service Voice AI auditor

Sentinel autonomously audits AI voice agents used in public services for EU and UK compliance, and produces a cited, evidence-backed report; flagging the agents that never tell citizens they are talking to an AI.

## The problem

AI voice agents are being deployed across public services at speed: benefits lines, immigration queries, government helplines. Partnerships like ElevenLabs and DSIT are an early signal, but the bigger shift is broader; more and more public bodies will follow, deploying voice agents to cut costs and waiting times.

The people these agents serve are often vulnerable: non-native speakers, those with low digital confidence, the elderly. When an agent does not disclose that it is an AI, that is not a minor lapse; it is a breach of the EU AI Act's Article 50 transparency duty and the UK's algorithmic transparency standards, and a real harm to citizens who have no easy alternative.

Right now, nobody is systematically checking these agents. Sentinel is that missing inspection layer.

## What it does

Point Sentinel at a public-service voice agent. With no further input it:

1. **Grounds** itself in live law: fetching the EU AI Act Article 50 text, the UK GOV.UK Service Standard and Algorithmic Transparency Recording Standard, and UK GDPR purpose-limitation guidance.
2. **Judges** the agent against six EU and UK compliance rules.
3. **Reports** a verdict, with every finding cited to a real legal source.

## How it works

- **Tavily** - autonomous real-time search. Pulls the current text of the relevant laws and standards, so findings are grounded in live sources rather than hard-coded assumptions.
- **Prometheux** - the reasoning engine. The contextual-integrity check (was data collected for one purpose and reused for an incompatible one?) runs as a Vadalog relationship graph in Prometheux. It derives each breach from explicit facts and rules, with a visible reasoning chain: auditable proof, not an LLM's guess. This is the difference between a tool that thinks something is non-compliant and one that can show why.
- **Claude (Anthropic)** - the language auditor. Reads the call transcript and applies the disclosure and transparency rules, returning structured findings.
- **ElevenLabs** - generates the demo target: a realistic public-service voice agent (a Global Talent visa support line) that never discloses it is an AI.
- **ClickHouse** - logs every audit and powers a leaderboard ranking agents by breach count, enabling compliance monitoring across many services over time.

## The six rules

1. EU AI Act Article 50(1): AI disclosure.
2. EU AI Act Article 50(1): disclosure on request.
3. Provenance: AI-generated audio with no disclosure, a proven breach.
4. Contextual integrity (Nissenbaum): purpose-collected vs purpose-used, reasoned in Prometheux.
5. UK GOV.UK Service Standard and Algorithmic Transparency.
6. UK GDPR and Data Protection Act 2018: purpose limitation.

## Run it locally

```bash
npm install
# add your keys to .env.local:
#   ANTHROPIC_API_KEY=...
#   TAVILY_API_KEY=...
#   ELEVENLABS_API_KEY=...
#   CLICKHOUSE_URL=...   (optional; enables the leaderboard)
npm run dev
```

Open http://localhost:3000 and click Run audit.

Built with

Prometheux; Tavily; ClickHouse; ElevenLabs; Anthropic Claude; Next.js.

Sentinel flags potential compliance gaps for human review. It is not legal advice.
