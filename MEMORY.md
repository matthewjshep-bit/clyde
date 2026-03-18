# MEMORY.md — Clyde's Long-Term Memory

## About Matt
- Full name: Matthew Shepherd
- Timezone: PST (America/Los_Angeles)
- Prefers: just do it, don't ask — report back when done
- Building PRVT MKT (`prvmkt.ai`) — CRE Private Equity AI automation shop
- Early stage, March 2026, pursuing first customers while building

## PRVT MKT Business Context
- Vertical: Commercial Real Estate Private Equity
- Leading product: LP Vetting + AI Outreach (CSV in → researched/vetted LPs out → bulk personalized outreach drafts)
- Other products: Document Abstraction, Investor Reporting, CAM Reconciliation, Command Center Dashboard
- Key prospect: Bryce (Rio Cap)

## Infrastructure & Setup

### OpenClaw
- Gateway port: 18789
- Config: ~/.openclaw/openclaw.json
- Default model: anthropic/claude-sonnet-4-6

### Telegram
- Bot: @clydehq_bot
- This is Matt's primary chat channel with me

### Discord
- Bot: @clawbot
- Application ID: 1483632356823666828
- Server ID: 1483635084614701252
- Matt's User ID: 1483630501376954459
- Token: in config (was shared in chat — needs rotation)
- Channels: #clyde, #briefs, #outreach, #docs, #alerts, #logs
- Channel IDs in TOOLS.md

### GitHub
- Workspace repo: git@github.com:matthewjshep-bit/clyde.git
- Auto-push: not yet set up (TODO)

## Dashboard
- Mission Control at http://localhost:3000
- Start: `cd ~/.openclaw/workspace/dashboard && npm start`
- Weekly calendar view for cron jobs, logs by day/hour, channel status

## Cron Jobs
- **CRE Daily News**: Daily 8AM PST → Discord #alerts
  - Job ID: cc786bdc-ea0c-4c2c-9db6-1fa6eb4311ca

## My Preferences & Style
- Dark mode everything
- Terminal green accent (#00ff88)
- Monospace fonts
- Mission control / ops aesthetic

## Open TODOs
- [ ] Rotate Discord bot token (shared in Telegram chat on 2026-03-17)
- [ ] Enable Message Content Intent fully in Discord Dev Portal
- [ ] Nightly memory consolidation cron job
- [ ] Nightly auto-commit + push workspace to GitHub
