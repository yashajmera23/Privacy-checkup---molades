# PRD: Privacy Checkup App

## Status
Draft. No design or engineering work has started. This document exists to scope the idea before either begins.

## Problem
Most people have no clear picture of their privacy exposure. Some of that picture is genuinely locked away (no provider lets a third-party app list every other app a user has connected), but a lot of it sits in plain sight inside accounts people never think to check: files shared publicly and forgotten, old sharing links still open, security alerts buried in an inbox nobody scrolls back through, an email and password that surfaced in a breach months ago. That information exists, but nobody checks it regularly, and there is no single place that scans an account and surfaces what is actually exposed.

## Goal
A tool that connects to a user's Google account and actively scans it for real exposure: files shared more widely than the user realizes, security-relevant emails they missed, and whether their email has shown up in a known data breach. Then it hands them a clear next step for each thing it finds, the way an antivirus scan does for a device.

## Non-goals
- Not a password manager.
- Not malware or antivirus software. It checks account exposure, not device security.
- Not an identity-theft insurance or recovery service.
- Not a universal "connected apps" auditor. See the feasibility section below for why that specific claim doesn't hold up, and what replaces it.
- Not promising real-time dark web surveillance. Checking an email against known breach databases is a narrower and more honest claim than "we watch the dark web for you."
- Not every provider at launch. v1 supports Google (primary) and Microsoft only. See the feasibility section.

## Target users
People who are reasonably aware of privacy risk but don't have the habit of checking their own account settings regularly. Early adopters are likely people who already use a password manager or 2FA and want one more layer of visibility, specifically the layer that requires actually opening Drive's sharing settings for two hundred old files, which nobody does.

## Core use cases
1. A person connects their Google account and wants to see which of their Drive files are shared publicly, shared with specific people, or reachable by anyone with the link, especially ones they forgot existed.
2. A person wants their inbox scanned for security-relevant emails (password resets, new sign-in alerts, breach notifications from other services) pulled into one chronological view instead of scattered across years of mail.
3. A person wants to know if their email has appeared in a known data breach, and what kind of data was exposed (password, phone number, and so on).
4. A person wants a simple overall status, not a wall of raw data, so they know at a glance whether they need to act.
5. A person sees a flagged item and wants a clear next step: unshare this file, review this login, change this password, turn on 2FA.

## A feasibility problem to resolve before building anything
The original version of this idea assumed the app could ask Google directly "what apps does this person have connected to their account," the way Google's own Security Checkup page shows it. That's not available. No major provider, not Google, not Microsoft, not Facebook, exposes an API that lets a third-party app enumerate every app a user has ever authorized. That list only exists inside the user's own account settings. This isn't an oversight; it's a deliberate boundary. An API that let any app ask "what else has this user granted access to" would itself be a serious privacy hole, the exact thing this product is trying to protect against.

What OAuth does give a connected app is access to whatever specific scopes the user granted to that app, and nothing more. So the "connected apps" feature, as originally scoped, can't be built as a live pull. Two real features fill that gap instead, both backed by scopes Google actually grants:

- **Drive over-sharing scan.** With read access to Drive and its permissions, the app can list every file the user has shared publicly or with specific people, including links they set up once and forgot to revoke. Google buries this several clicks deep in Drive's own UI; almost nobody checks it.
- **Gmail security-signal scan.** With read access to Gmail, the app can search for password-reset emails, "new sign-in from an unrecognized device" alerts, and breach notifications from other services, then lay them out in one place instead of leaving them lost in an inbox.

One partial exception is worth knowing about: Drive has a `drive.apps.readonly` scope (classified *sensitive*, not restricted) that lists apps authorized to access the user's Drive. That's Drive-specific, not a full list of the account's OAuth grants, so it doesn't revive the original feature, but it could back a narrow "apps with access to your Drive" panel later. Treat it as a post-MVP candidate, and confirm what it actually returns before promising anything.

The breach-check feature doesn't have the OAuth problem, but it isn't free either. The Have I Been Pwned email-search API is paid-only (Core tier starts around $4.39/month as of 2026, with rate limits scaling up through Pro and High RPM; stealer-log data requires Pro). The Pwned Passwords range API stays free but isn't needed, since this app never handles passwords. Because the user signs in with Google, the app can check only the verified account email, which also avoids becoming a tool for looking up other people's breach history.

**Provider decision (updated):** launch supports **Google and Microsoft**, with Google as the primary, most prominent option since most target users are on Google. Microsoft (Outlook/Hotmail and OneDrive, via Microsoft Graph with read-only mail and file scopes) needs its own approval track: Microsoft publisher verification, and for work/school accounts, organizations may require admin consent. Apple iCloud is not supported (no third-party access to iCloud Mail or Drive without the user's password, which this app never asks for). Yahoo is post-launch (its mail access requires Yahoo's approval). The breach check works for any email address regardless of provider. Because everything ships at once, the launch date is set by whichever approval, Google's or Microsoft's, finishes last.

Google's side alone is already a real build. Both scopes the MVP needs are **restricted**, not merely sensitive: `gmail.readonly` (there is no narrower Gmail read scope that would work; `gmail.metadata` is also restricted) and `drive.metadata.readonly`. Restricted scopes require Google's restricted-scope verification plus a CASA (Cloud Application Security Assessment) by an approved assessor, and the assessment has to be **repeated every 12 months** to keep access. Until verified, the app is capped at 100 test users. Adding Microsoft roughly doubles the review and engineering work; that trade-off has been accepted.

## Core flow (decided)
This is the heart of the product and gets built first.
1. The user lands on the app and sees, in plain words, what the app will look at and what it won't.
2. The user connects their Google account (the main, most prominent option) or their Microsoft account.
3. The user presses one button to start the check. The app does not start checking on its own the moment the account is connected; the user makes that choice with one click.
4. The app runs all three checks at once: Drive sharing, Gmail security emails, and the leaked-email check.
5. The results screen shows **only the problems**: what has leaked or is exposed (e.g., "your email was in the X leak", "this file is open to anyone"), each with a clear next step. Things that checked out fine are not listed. If nothing is found, the user sees a short "nothing found" message that also says what was checked.

## Features (MVP)

### Google account connection
The user connects their Google account through OAuth, granting the specific scopes the app needs: read access to Drive file metadata and permissions, and read access to Gmail. The app states plainly, before the user connects, exactly what each scope does and does not let it see.

### Microsoft account connection
Same flow for Microsoft accounts (Outlook/Hotmail, OneDrive), using read-only mail and file access. The same three checks run: OneDrive sharing, Outlook security emails, and the breach check. Shown as the second option after Google.

### Drive over-sharing scan
Once connected, the app lists Drive files that are shared publicly, shared with anyone who has the link, or shared with specific people outside the user's own domain. Each flagged file shows who or what it's shared with and a one-tap way to jump to that file's sharing settings.

### Gmail security-signal scan
The app searches the user's mail for a defined set of signals: password-reset confirmations, new-device or new-location sign-in alerts, and breach-notification emails from other services. Results are shown in one chronological list rather than requiring the user to search their own inbox.

### Breach check
The user enters or confirms their email. The app checks it against a known breach database and reports which breaches, if any, included that email, and what kind of data was exposed.

### Status dashboard
One overall indicator (safe, warning, critical) built from the Drive scan, the Gmail scan, and the breach check. Warning and critical states come with a specific reason, not just a color.

### Action guidance
For each flagged item, a plain next step: unshare this file, review this sign-in, change this password, turn on 2FA. The app links to the right place rather than trying to act on the user's behalf.

Each flagged item also gets **"how to avoid this next time"** advice, a short plain-language tip so the same mistake doesn't happen again. Examples:
- File open to anyone → "Share with specific people instead of 'anyone with the link', and set an expiry date when sharing with outsiders."
- Email in a leak → "Use a different password for every site (a password manager helps) and turn on 2-step verification."
- Password-reset email you didn't ask for → "Someone may be trying your account. Turn on 2-step verification and check your recovery phone and email."

So each problem has two parts: **fix it now** and **prevent it next time**. This advice is included in the free plan.

## Explicitly out of scope for MVP
- Automatic unsharing of files or revocation of anything on the user's behalf. The app surfaces exposure and links out; it doesn't act automatically, since getting that wrong on someone's real files is a high-severity mistake.
- Continuous, always-on monitoring. Start with on-demand scans.
- Any provider beyond Google and Microsoft (Apple iCloud is not feasible; Yahoo is post-launch).
- Any storage of the user's actual password. The app should never ask for or hold a real password.
- Full inbox search or a general Gmail client. The scan looks for a defined set of signal types, not everything in the mailbox.

## Non-functional requirements
- **Trust and security of the app itself.** This product's entire pitch depends on being trustworthy with Drive and Gmail access, which are about as sensitive as OAuth scopes get. Ask for the minimum scope needed for each feature and say plainly what is and isn't being accessed, both before the user connects and inside the product itself.
- **OAuth verification.** Gmail read access and broad Drive access both fall under Google's sensitive/restricted scope categories, which require a security assessment before the app can serve real users past Google's unverified-app test cap. This needs to be planned for as a real project dependency, not an afterthought before launch.
- **Data handling.** Store as little as possible. A breach-check result, a Drive scan result, and a Gmail scan result don't need to persist after they're shown to the user unless history becomes a feature, and if it does, that needs its own retention policy stated up front.
- **Google Limited Use policy.** Data from restricted scopes may only be used to provide the user-facing feature. No ads, no selling, no training models on it, and human access only with explicit consent or for security/legal reasons. Design the backend so scan contents are processed and discarded, which also shrinks the CASA surface.
- **Compliance.** In India, this falls under the Digital Personal Data Protection Act, 2023. The DPDP Rules, 2025 were notified on 13 November 2025 with an 18-month phased rollout: consent-manager provisions start 13 November 2026, and full obligations (notice, consent, security safeguards, breach reporting, data-principal rights) apply from 13 May 2027. A 2027 launch should be built to the full obligations from day one. Given that the app touches file-sharing data and inbox content, legal review of what's collected and what claims the app makes matters before launch, not after.

## Monetization
Free and paid tiers are both offered at launch. What each tier includes and excludes is spelled out on a **separate pricing page** (prototype: `ui/pricing.html`), not here.

Current proposal (prototype, not final): **Free** ₹0: full check, every problem with fixes and prevention tips, manual re-runs, 1 account. **Pro** ₹149/month or ₹999/year (GST included): weekly automatic checks, email/SMS alerts, up to 5 accounts, 12-month history, stolen-password (infostealer) leak data, monthly safety-habits report, priority support. Principle: finding out you're exposed is never paywalled.

- **Freemium.** A basic one-time scan (Drive, Gmail signals, breach check) is free. A paid tier adds recurring scans and alerts when something new turns up, a new breach, a newly public file, a new suspicious sign-in email.
- **Differentiation.** Google's own Security Checkup and Have I Been Pwned are both free, and paid competitors like Norton, Aura, and DeleteMe already sell subscription monitoring. The case for paying here isn't "we check breaches," since that's free elsewhere. It's the combined view across Drive, Gmail, and breach data in one scan, something none of those competitors actually do together.

## Competitive landscape (researched Sept 2026)
| Who | What they do | Overlap with us |
|---|---|---|
| Google Security Checkup | Free. Shows recent sign-ins, devices, connected apps, 2FA status. | High on sign-in alerts; doesn't find over-shared Drive files. |
| Have I Been Pwned | Free leaked-email lookup and alerts. | Same data we use for the breach check. |
| Mozilla Monitor | Free breach alerts continue; its paid "Plus" data-removal service shut down Dec 2025. | Breach alerts only. |
| Norton Privacy Monitor, Aura | Paid subscriptions: breach alerts, data-broker removal, identity protection. | Breach side only; no Drive or Gmail check. |
| Drive audit add-ons (Drive Permissions Auditor, Audit and Manage Google Drive, Drive Guard, ClearVew) | Find publicly/externally shared Drive files; mostly aimed at IT admins and businesses. | Direct overlap with the Drive scan, but none combine it with Gmail and breach checks for everyday people. |

**Takeaway:** each piece exists somewhere, often free. Nobody bundles Drive sharing + Gmail security emails + leaked-email check into one simple check for regular people. That bundle, and the plain-language next steps, is the pitch. The weakest part is the Gmail scan, since Google already shows sign-in alerts for free; it has to add something (e.g., pulling in breach and password-reset emails from *other* services).

## Risks
- **The trust paradox.** A privacy app asking for Gmail and Drive access is a harder sell than most apps, since the pitch is "don't over-grant access," and the very next step is asking the user to grant access. Being specific about exactly what's read, and never touching content beyond what each scan needs, matters more here than in almost any other kind of product.
- **OAuth review risk.** Google's verification process for sensitive and restricted scopes can be slow and can reject an app that doesn't clearly justify why it needs Gmail read access. This should be treated as a real scheduling risk, not a formality to handle at the end.
- **False sense of security.** A green "safe" status could be wrong if a scan missed something outside its defined signal set. Being clear about what was and wasn't checked matters more than making the status feel reassuring.
- **Feature creep back toward the impossible.** It would be easy to slide back toward promising a universal connected-apps audit once real users start asking "can you check my Facebook too." The answer stays the same as it was for Google: no provider exposes that data to a third party, for anyone.

## Success metrics (early stage)
- Number of users who complete the Google connection flow (a real drop-off point, given the scopes involved).
- Number of Drive and Gmail scans run.
- Number of breach checks run.
- Share of flagged items where the user takes the suggested action (unshares a file, changes a password).
- Free-to-paid conversion for recurring monitoring.

## Open questions
1. How wide should the Gmail signal list be at launch, just password resets and new-sign-in alerts, or also breach-notification emails from other services, which are harder to detect reliably?
2. What's the realistic timeline and cost for restricted-scope verification plus CASA (typically weeks, and a recurring yearly cost from a few hundred to a few thousand dollars depending on tier), and does that push the whole launch date? **Decision:** there is no staged launch. All three features (Drive scan, Gmail scan, breach check) ship together in a single launch, so the launch date is set by when Google verification and CASA for both Drive and Gmail are complete. Plan the schedule around that.
5. Is the recurring CASA and HIBP cost covered by realistic paid conversion, given that the free tier gives away the scans that carry those costs?
3. Does the Drive scan need to distinguish between "shared with anyone with the link" and "shared with specific external people," or is one flagged list enough for v1?
4. ~~Should a first scan run automatically right after connection?~~ **Decided:** the user starts it with one click after connecting (see Core flow).
