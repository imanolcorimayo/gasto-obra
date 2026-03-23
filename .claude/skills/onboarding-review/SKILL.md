---
name: onboarding-review
description: Review any user-facing change (web pages, WhatsApp flows, empty states, share pages) against onboarding principles. Use after modifying landing page, project creation, expense flows, client views, or onboarding-related components.
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

Review the changed code against the onboarding principles below. Run `git diff` to identify what changed, then read the affected files for full context. Evaluate every user-facing change — UI text, flow logic, empty states, redirects, WhatsApp messages — through the lens of these principles.

## Context

Gasto Obra has two user roles with distinct onboarding needs:

- **Provider (Proveedor):** Registers expenses via WhatsApp. Their aha moment is "I logged an expense in 10 seconds." Primary channel: WhatsApp. Onboarding is action-oriented.
- **Client (Cliente):** Views expenses on a web dashboard. Their aha moment is "I can see today's expenses without calling anyone." Primary channel: Web. Onboarding is about trust and clarity.

Every change must be evaluated from the perspective of the role it affects.

## The 10 Onboarding Principles

Check every change against these. A violation of any principle is a finding.

### 1. Reduce Time-to-Value (TTV)
Every step between "first contact" and "aha moment" is a step where users are lost. If a change adds steps, friction, or delays before the user experiences core value, flag it. If it removes steps, celebrate it.

**Ask:** Does this change bring the user closer to their aha moment, or further away?

### 2. Segment Early, Diverge Immediately
Providers and clients have different goals, channels, and aha moments. A single path for both means a mediocre path for both. Any change that treats all users the same when it could differentiate is a miss.

**Ask:** Does this change know which role it's talking to? Does it tailor accordingly?

### 3. Teach at the Moment of Need
Information presented before it's relevant is noise. Commands, features, and explanations should appear when the user first needs them — not during signup, not in a welcome dump.

**Ask:** Will the user have context to understand this right now? Or are we teaching too early?

### 4. Empty States Are Onboarding Surfaces
Every empty screen is either a dead end or a teaching moment. Empty states should: explain what will appear, show a preview of the populated state, and provide the single action that fills it.

**Ask:** If a new user sees this screen with zero data, do they know what to do next?

### 5. Show, Don't Tell
A live demo beats documentation. A sample row beats a description. A preview beats helper text. Users learn by seeing outcomes, not reading instructions.

**Ask:** Are we explaining with words what we could show with an example?

### 6. Maintain Momentum Across Channels
When users cross channels (web to WhatsApp, WhatsApp to web), the handoff must be explicit, guided, and confirmed on both sides. Never leave the user wondering "did it work?"

**Ask:** If the user just did something on one channel, does the other channel acknowledge it? Is the next step clear?

### 7. Personalize the Invitation
When one user invites another (provider shares link with client), the invitation IS onboarding step 1. It should feel personal, set expectations, and show value even before joining.

**Ask:** Does this feel like a personal invitation or a generic product page?

### 8. Endowed Progress
Starting at 1/5 instead of 0/5 increases completion. Pre-completing steps gives momentum. Small wins compound into engagement. Any setup flow should acknowledge what the user already accomplished.

**Ask:** Are we crediting the user for steps they already completed?

### 9. Don't Over-Onboard Simple Roles
The client experience is view-only by design. The less training they need, the better the UI. One welcome, one explanation — then get out of the way. Over-explaining simple things signals that the UI failed.

**Ask:** Is this guidance necessary, or is the UI self-explanatory? Are we adding noise to a simple experience?

### 10. Meet Users Where They Are
Construction workers live on WhatsApp, not web browsers. If the product's core loop is WhatsApp, let users start there. Web is for auth and dashboards — don't force users to the web for things that could happen in their primary channel.

**Ask:** Are we forcing a channel switch that could be avoided? Are we respecting the user's natural environment?

## What NOT to Do

Flag these anti-patterns if found in the changed code:

- **Product tours / walkthrough modals.** The UI is simple enough that inline guidance beats modal tours. Don't add step-by-step tours that block interaction.
- **Onboarding emails.** Users are in construction — they live on WhatsApp, not email. Never add email-based re-engagement when WhatsApp is available.
- **Making the landing page longer.** The landing page already sells well. The gap is post-signup, not pre-signup. Don't pile more content onto the landing page.
- **Forcing clients through setup.** Client path should be: click link > sign in > see data. Zero configuration. Any change that adds client-side setup steps is wrong.
- **Info dumps.** Listing all commands, all features, or all capabilities at once. If a change introduces a list of more than 3 items the user must read before proceeding, flag it.
- **Feature-centric language.** "Here's the dashboard" vs "See what your provider spent today." Always frame from the user's goal, not the product's structure.
- **Mandatory long forms before value.** Every field before the aha moment is a drop-off risk. If a change adds required fields to early flows, question each one.
- **Blocking exits.** Forced flows with no "skip" or "later" option. Users must always be able to escape onboarding.

## Review Checklist

For each user-facing change, verify:

- [ ] Which role does this affect (provider, client, or both)?
- [ ] Does this bring the user closer to their aha moment?
- [ ] Is the user being taught something at the right moment (not too early, not too late)?
- [ ] If this is an empty state — does it educate, motivate, and direct?
- [ ] If this crosses channels — is the handoff explicit and confirmed?
- [ ] If this is guidance text — could it be replaced by showing instead of telling?
- [ ] Does every screen/state have a clear next action? No dead ends?
- [ ] Is the language Argentine Spanish, voseo, concise?
- [ ] Are we adding complexity that the user didn't ask for?
- [ ] Does this change work for BOTH new users AND existing users without breaking anything?

## Existing User Protection

Every onboarding improvement must be invisible to users who don't need it. Check:

- [ ] Onboarding-specific UI is gated behind a condition (first visit, 0 projects, 0 expenses, etc.)
- [ ] Existing users with data skip onboarding screens entirely
- [ ] No regressions to existing flows — redirects, navigation, and actions work the same for established users
- [ ] Dismissable elements stay dismissed (persisted in Firestore or localStorage)

## Output Format

Group findings by severity:

**Must fix** — Principle violation that will cause user drop-off, confusion, or dead ends
**Should fix** — Missed opportunity to apply a principle, unnecessary friction
**Consider** — Minor improvements, wording tweaks, small UX wins

For each finding: location (file:line), which principle is violated (by number), what's wrong, and a concrete fix suggestion.
