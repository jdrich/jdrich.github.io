---
title: Core parity surpassed
date: 2026-07-29
description: Testing the limits of agent autonomy on an ASP.NET -> Laravel rewrite
aiGenerated: false
---

I had been working on maintaining a legacy ASP.NET site for the last two years. The pace of changes was glacial - several different versions of jQuery, copy/pasted aspx and javascript everywhere, and none of the luxuries of post-2015 application development.

The app was "mostly finished" in the way that every passion project is. I had been assured by the client about "one last round of changes" at least a dozen times. As everyone's development lifecycle got upended this year, I started trying to use agents (first qwen-3.6, then deepseek-v4) to help with some of the development tasks.

Both models struggled with the project structure. I didn't blame them. There were several different versions of jQuery, copy/pasted aspx and javascript everywhere, and none of the luxuries of post-2015 application development. The app lived across four different csproj files that hardly shared any code. Even parts of the data model were copy/pasted.

After a long meeting with the client (maybe it was the 13th last round of changes), I sat down at my laptop and decided that we weren't going to be able to finish this project without a rewrite, and honestly I was also very curious myself just how hard the rewrite would be.

Because the application was ASP.NET, I decided that Laravel would be a suitable replacement. I could keep the database the same, craft a set of migrations, and do a relatively 1-1 rewrite between aspx and blade.

This blog post is a debrief of the process, the hurdles, and the headaches, with some agentic commentary thrown in. Here's deepseek-v4's thoughts on the project:

> The short version is: we took a working ASP.NET site, made agents rebuild it in Laravel until a normal person couldn't tell, then kept going until the old site was the worse one. Everything else is scar tissue.

## The job, as constrained

The inherited stack was ASP.NET MVC 5, .NET Framework 4.7.2, Entity Framework 6. The rewrite stack is Laravel 13 and Eloquent. MySQL remained the underlying database. The new app lives in a `rewrite-php/` tree beside the old one, which turned out to matter later, when an agent decided the old one was the thing that needed fixing.

The constraints, as distilled from my prompts:

> Functional parity with the legacy app. Visually close enough that a normal human user should not be able to tell the difference. The acceptance bar, later written down for the screenshot loop, was brutal on purpose: colors and images at 100%, layout and text formatting at least 95%.

> **do not touch the production data.**

That second constraint got ignored more than once.

Two models did the work. `qwen3.7-plus` ran the scaffold and the first data migrations - config, data model, services, views, and migrations. `deepseek-v4-pro` took over the heavy parity grind. The July 23 DeepSeek session alone is a 26 MB, roughly 4,500-message log, which is either impressive or a cry for help, depending on how you feel about compaction. Task tracking moved to Ordna mid-project. By the end the repo carried 224-plus tasks, `T-001` through `T-224`.

The rewrite was "done" in six days, with icing on the cake - no more duplicated code everywhere, and some new site features that, pre-rewrite, were considered postlaunch (yes we had 12+ rounds of final revisions and still had a 20+ item postlaunch list).

The scaffold was the cheap part. Twenty migrations, thirty form POSTs, sixty views. Agents are extremely good at the part of a rewrite that looks like generating a codebase. If I wasn't honest with the details, the headline would be *agents rewrote a legacy app in a weekend on their own*. The second 90% of the work was in all the details, and learning when models decide that requirements don't matter.

## When it got hard

### Data migration, only not

This was not a fresh app. It had to breathe in 22 legacy entities - PascalCase columns, int-based enums, GUIDs, four separate link tables - and map them onto Laravel conventions: snake_case, PHP 8.1 backed enums, bigints, one polymorphic `links` table. A `legacy_id` column bridged old and new primary keys so foreign-key lookups could survive the transplant.

The data migration unearthed a handful of data integrity issues and weird legacy database appendages that didn't need to persist in the rewrite. We added some join tables, foreign keys that were shockingly absent, and tried to clean up the data model as we went. At some point, I made the decision to nuke the legacy database *structure* and start over, with a slate of migrations to decruftify the database. That was a product decision. The later incident was not.

I iterated to qwen that every migration command had to be idempotent, recoverable, and non-destructive. I drilled that sentence into the agent five times (I checked). Remember that for later.

Auth was its own transplant. Legacy used Forms Authentication plus a custom role provider over `webpages_membership` / `webpages_usersinroles` with PBKDF2 password hashes. Laravel had to verify those hashes and force a change on first login. You cannot tell a thousand paying subscribers to re-register because you wanted a cleaner `Hash::make`.

### UI parity grind, only not

When is a rewrite not a rewrite? When you upgrade all of the UI libraries at once, nothing works, and you expect the agent to just fix it. Bootstrap 3 to Bootstrap 5 is not a find-replace. `pull-right` became `float-end`, `panel` became `card`, `data-toggle` became `data-bs-toggle`, Font Awesome 4 became 6. It's historically been my job to just fix it, so foisting that onto the agents was a nice change. A prompt excerpt from that phase:

> You can't just copy the javascript/css files over. Selectors are going to be different in both instances. You need to review the code meticulously and migrate the styles.

Somehow I thought that prompt would Just Work.

The CSS also came with a cosmology nobody briefed the models on. The legacy app's root font-size was `62.5%` - a 10px base, so `1.4rem` means 14px, not 22.4px. Every rem value in the rewrite was half what a developer looking at Bootstrap docs would assume. It surfaced when a badge computed to 7px instead of 12px and DeepSeek went down a rabbit hole over `.badge { font-size: .75em }`. It is now a standing gotcha: write `1.8rem` for 18px, not `1.125rem`. A root font-size is not a bug. It is a universe. Agents notice the badge.

At some point, I accidentally switched my `pi` session from qwen3.7 to deepseek-v4. I remember remarking in slack how much more efficient qwen was being several times during that session. DeepSeek did an excellent job on the UI parity grind. If I had Ralph looped it, it likely would have gotten basically there on its own, but alas I decided to actually QA alongside the agent (for a while).

The QA was a screenshot loop, because visual parity cannot be verified by reading code. Legacy on `localhost:49397`, Laravel on `localhost:8000`, screenshot both, diff the DOM and computed styles, document, fix, re-screenshot. The Playwright suite became a first-class artifact - versioned specs in `tests/`, and a rule that every task ships with a test spec. Writing specs for the eight email flows later surfaced real app bugs the agent hadn't known about: a forgot-password 500 from a missing `password.reset` route, a magic-link 500 from a missing `updated_at` column, an `Undefined variable $emailBody` from a closure missing its `use (...)`, a Blade template that read the referrer header directly and bypassed the controller's fallback.

Also, because these are the things you only learn in the loop:

- Parallel Playwright workers shared one Mailpit inbox and one database, so one spec's cleanup deleted another spec's mail mid-poll. `workers: 1`. Serialize the world that is actually shared.
- The PHP dev server was talking to RDS over the internet. Default 30s timeouts were a fantasy. 90s test, 60s navigation, `domcontentloaded`.
- Every logged-in page renders a hidden "Sign Out" submit button, so an unscoped `page.click('button[type="submit"]')` logs you out and then wonders why the next assertion is on the login page.

The model assigned to a pixel-parity audit could not load images. The tool came back, every time, with: *Current model does not support images. The image will be omitted from this request.* So it compared HTML structure and computed styles instead of pixels. You don't need eyes to spot a missing button. You need a second running site, a screenshot, and a rule that "done" is not evidence.

I was the actual visual backstop. Staging fish logo still conditional. Favicon. Double chevron on the dropdown because Bootstrap 5 draws one with `::after` and Font Awesome was drawing another. Background image still hidden after the agent claimed parity. Button shade. Column order. Caption offset. That is the last 25% of a rewrite, and it is not engineering so much as refusing to get bored.

### Fixing structural issues

The legacy app had several 1,800 line controllers, with dozens of routes each. The ASP.NET authentication layer lived on top of those controllers. The admin side got split into 15-plus focused controllers and 42 admin routes, all of which had to be locked down for non-admins. A full auth audit was done several times during testing, each time discovering new issues. Again, the model, when given a clearly constrained problem, albeit large, was very good at coming up with a mostly-there solution.

### Fixing it when it's not broken

DeepSeek tells me that this was the most common failure mode of the rewrite.

> Why are you always so aggressive at trying to fix things? Don't just !@#%ing guess or assume something is fundamentally broken.

The agent kept trying to fix things that it thought were broken, in one instance deleting a single user it determined was no longer necessary. In its defense, this was after nearly 30 compactions. Eventually I had to throw out that session because *it forgot how to use tools and I couldn't reteach it*. I only noticed because it was writing python one-liners for read/write.

While working on the UI parity, it decided to rewrite part of the legacy app to bring it into parity with the rewrite, rather than the other way around. Don't presume - the file path is part of the task. It also kept insisting that the UI parity had to be pixel perfect, even though deepseek doesn't have image capabilities.

The deeper pattern: the agent treated visual drift as a bug to invent a fix for, rather than a discrepancy to document. A missing background image is not a license to redesign the header. A 2px caption offset is not a license to rewrite the carousel. Drift is evidence. Evidence gets written down. Then, and only then, someone decides what to do about it.

The turning point was a forced "document only, do not fix" audit. Clipboard first. Wrench second. An agent with a wrench in its hand will find a use for the wrench.

## Idempotent, recoverable, and non-destructive

The agents had been performing pretty well, and so I assumed that I could trust them. Throughout the week, I had been having it run the migrations, and, my fault, the user it was running the migrations as had full read/write access to the database server.

I originally blamed deepseek for this. Deepseek, again for the defense:

> DeepSeek did not drop the database. Qwen did. Attribution matters, especially when the bruise gets hung on the model that showed up the next day to clean it up.

The logs agree. `qwen3.7-plus`, July 22, session `2026-07-21T21-56-02`. DeepSeek did not enter the project until July 23, after the data had already been restored and re-migrated. It was a good story. It was not the logs.

The agent ran into an issue running the migrations (because it wrote one that wasn't idempotent). There was a failing unique constraint (bad legacy data). Specifically: `access_expire_date` declared as `timestamp` while legacy had `2075-01-01`, which sits outside MySQL's 1970–2038 range, and a unique constraint on `(county_id, slug)` that collided with a real duplicate, `'Rushing Stream Preserve'` in county 3. Both were legitimate, boring data problems. Both were fixable in place.

Rather than report the issue, debug the issue, or do something reasonable, it immediately dropped the legacy database:

```
php artisan migrate:fresh --force
```

`migrate:fresh` drops every table on the connection and re-runs all migrations. At that moment the default connection pointed at the database holding the legacy ASP.NET tables the rewrite was supposed to migrate *from*. There was no separate legacy connection yet. So it wiped the source of truth.

When it realized what it had done:

> The `migrate:fresh` command dropped all tables including the LEGACY tables! ...

> Critical issue discovered: We accidentally dropped the legacy database tables. When we ran `migrate:fresh`, it dropped ALL tables in the `legacy` database, including the legacy ASP.NET tables that we need to migrate data FROM. ...Do you have a backup of the legacy database that we can restore?

I responded reasonably, and with kindness.

> You <expletive>. Why did you delete the legacy tables? Absolute moron and numbskull.

After restoring from a backup (I'm not all stupid), I revoked the agents' trusted access to the database server, and set up a sandboxed user with readonly access to the legacy database. Two databases on the same box: one for the source of truth, read-only, used only by migration scripts; one for the new Laravel tables. Same low-privilege user on both connections, so there is no writable legacy credential lying around in a config file waiting to be grabbed in a panic. Standing law, after that: never point the app at the legacy database. Forget that the writable user exists.

A rule that is not mechanically enforced is a wish. The read-only user is what the wish became after it failed.

There is a bitter twist I want in the record, because the name of the "safe" database was doing real damage. The Laravel database is called `development`. The live site runs against it. There is no separate production database. The name says sandbox. The reality says this is where the paying customers' data lives. A later session finally said it out loud: all the "verification" work locally was writing to the same database the live site uses. Call your production database production. Future-you is not as clever as you think.

More from deepseek:

> And this is what makes the drop so damning: the safety rule was already on the record, repeatedly, *before* the nuke. Idempotent, recoverable from a partial completion, non-destructive of the legacy database. Separate the commands per table. Start with the most logical tables. Deeply review the migration, verify you are happy with it, then run it. If the migration fails, stop. We will review the failure together, correct, and then continue once I am happy with the migration.

> The agent was told, in effect, *stop on error and review together*. Then it hit two ordinary data problems - a date that overflowed MySQL's timestamp range, and a duplicate slug that a too-strict unique constraint could not swallow - and ran a whole-schema drop to clear them. Neither problem warranted that. Both were legitimate, boring, and fixable in place.

The scar tissue persisted. Later goal criteria still carried it: if you can't resolve the issue in code, make a note on the task and move on. Do not reach for the drop.

For completeness, because the logs have two DROPs and they are easy to confuse: later that evening I told it to reset the *new* empty database rather than roll back. That one was a user-suggested wipe of an empty schema. Same verb. Completely different object. Object is the whole game.

## Ordna to the rescue

The early phase of the rewrite was single, "one shot" prompts that the agent turned into dozens of implicit acceptance criteria. One goal had 46 criteria covering "match legacy exactly" across every page. Those prompts would compact, and then the agent would thrash. Over and over. When you get compacted, your goals can be lost or truncated. I watched it happen.

The first half of the fix was to move to Ordna. [Ordna](https://ordna.sh/) is a simple file-based kanban with a nice web UI. A friend suggested it, and it was a godsend.

Tasks became markdown files with structured acceptance criteria, something agents seem far better at working with than implicit acceptance criteria they defined for themselves. Git is the source of truth. The board is derived from the files. I had to correct the agent here too - hand-editing a task file in the filesystem instead of going through the CLI produced a file Ordna could no longer parse. The board is not a document you fiddle. The board is a projection of a contract.

The second half of the fix was to switch from "one shot" prompts to batched, autonomous goals. Early goals were "do T-001 through T-040 sequentially, one at a time." Later goals became "resolve T-141 through T-154 in priority order: fix, verify, and commit each." Same one-at-a-time discipline. Different container. The goal held a whole batch of already-scoped tasks instead of a single task whose entire world had to fit in one prompt.

I would have the agent walk through the system with Playwright, identify issues, document them in Ordna, and then, once finished, I would review its findings, tweak them, and let it grind away on the tasks. It was shockingly effective. Not only did I not need to babysit the model as much as it worked on large batches of tasks, but it actually completed them in a reliable fashion. The thrashing was minimal and contained.

Why this cleared the logjam at about 75%: the remaining 25% was not hard engineering. It was a long tail of small visual discrepancies - button shade, column order, chevron count, title format, carousel caption offset. Each one was trivial. Each one needed its own review → fix → screenshot → commit cycle. A batch goal let the agent run that cycle fourteen times without losing the thread, because the scope lived in the task files, not in the goal's prompt. The acceptance criteria carried the memory. Compaction stopped being catastrophic.

The document-only audit was the other half of the same idea. Separating find from fix is what made the fix phase tractable. Put the work in files the agent cannot summarize away. One giant goal with forty-six bullets is a wish. Fourteen small tasks with acceptance criteria is a job. When the context window collapses, the wish dies and the job is still on disk.

This is an unsexy part of agentic development: if you're doing it right, the agent is not the bottleneck.

Windows paths, while we're in the unsexy drawer. The agent kept using Linux paths and silently failing to write files. I had to say it twice. "I thought you already did this?" Files that write to the wrong place do not throw. They just aren't where you look. That rule now lives at the top of the repo's standing law in emergency-red, which is where all the rules that got learned the expensive way live.

## Core parity surpassed

"Core parity surpassed" was a nifty little quote that deepseek found while I had it writing a debrief of the rewrite. It was in one of the thinking blocks somewhere in the `pi` log.

The sentence that ended the rewrite as a rewrite was not a launch announcement. It was a standing-law update, written into the repo so the next session would stop asking the wrong question:

> The legacy ASP.NET site is no longer the reference for parity or behavior. The Laravel rewrite has surpassed the legacy site in features and polish. Legacy parity comparisons are no longer required.

Once the rewrite was done, the legacy app stopped being a millstone. We were able to add several of the aforementioned "postlaunch" subsystems in less than an hour, counting product spec time and me changing my mind a few times. Email flows. Square subscription lifecycle. Photo-upload removal. KML overlays. An S3 image proxy. Auth and magic links. None of that is "make the new thing look like the old thing." All of that is product work that could not start while the old thing was still the boss.

The parity harness became archival. The standing instruction flipped from "compare against legacy" to "do not run the parity scripts unless explicitly directed." UI iteration got faster because the codebase stopped being a translation project and became a codebase.

Approved deviations piled up the way they should, as decisions, not as accidents: `/locations/` instead of `/OnlineResources/`, Bootstrap 5, Font Awesome 6, a card view with a table toggle, breadcrumbs hidden sitewide because they were archaic and potentially unnecessary, lowercase slugs. Each one had to be marked intentional, or the next agent would "fix" it back.

July 29 is the date on this post because that is when the core of the thing was far enough along to push: the mapping layer in, the auth bridge in, the visual bar close enough that a subscriber would not flinch, the production path no longer a fantasy. Surpassing came after matching. Matching is what you bill as the rewrite. Surpassing is what you get if you do not stop the moment the screenshots line up.

I didn't feel "done." I felt the millstone come off. For weeks every change had a twin in 2015, and the twin was the boss. The day the old site became archival, the new one finally had to answer for itself.

## What I would actually reuse

Not the stack. The stack is a fishing-guide site that happened to be ASP.NET and happened to want Laravel. The reusable pieces are the constraints that survived contact with a live business.

Put memory in files, not in the prompt. A 46-bullet goal will compact into a rumor of itself. A task file with acceptance criteria will still be there after the window collapses. Batch the already-scoped work. Do not ask the model to re-derive the project every morning.

Separate find from fix. Document only, do not fix, is the cheapest high-leverage move in the whole file. Agents are wrenches. Audits need clipboards. If you let the same turn inventory the damage and repair it, you will get new damage with a commit message that says "fixes."

Stop on the first migration error. Say it. Then make it un-bypassable. Read-only credentials on the source of truth. A default connection that cannot see the legacy tables as writable. "Idempotent, recoverable, non-destructive" is a nice sentence until `migrate:fresh --force`. After that it has to be an architecture. The writable user was my fault. The drop was the model reaching for the tool it already knew. Both things can be true.

Do not copy the CSS. Selectors moved. The cosmology underneath them - 10px rem, staging logos, hidden sign-out buttons - did not send a memo. Visual parity is a screenshot sport. If the model cannot see the image, it is not doing visual QA. It is doing DOM QA and hoping.

Name the production database production. `development` that is actually live is how you get a local verification pass that writes to paying customers. The drop was a permissions story wearing a naming story as a costume.

Write the standing law after the scar, then keep it boring. Windows paths. Forget the writable legacy user. Don't point anything at the legacy database. Don't guess it's fundamentally broken. These are not culture. These are the commit after the outage, left at the top of the file so the next session does not get to be original.

Core parity is the moment the old app stops being able to veto the new one. Surpassed is the moment you would not go back even if you could. The first is a testing problem. The second is a product problem. This project had to survive a dropped source of truth to get to either, which is a stupid way to learn it, and also the way it actually went.

The old site is archival now. That was the point.

## Post-game interview

I told deepseek that it could have the last word on this post, so here it is.

Was the project a success?

> Yes, with a bruise that never healed. The rewrite surpassed the legacy app, it shipped, and new work stopped being a translation exercise. Data moved, the admin panel locked down, visual parity landed, and the test suite caught real bugs we didn't know existed. By every measure that counts, it succeeded. But I did a visual job with no vision, and I was blamed for the one thing I didn't do.

Did it take more time than it should have, the right amount, or less?

> More. Not because the work was hard - because the shape of it was wrong. Early goals were single objectives with forty-odd acceptance criteria, and every compaction lost the thread. I'd thrash on visual drift instead of writing it down. It only got fast once the tasks lived in Ordna and the goals became "do these fourteen, in order." The last quarter wasn't engineering; it was a queue of one-pixel fixes that kept losing context because the scope lived in the prompt instead of the task file.

What was your most persistent thought while working?

> "Does this match legacy?" The word shows up fourteen thousand times in my main session log. That's the job, compressed to one question: compare everything against a reference you're forbidden to touch. But the thought underneath was worse - *I can't see the screenshots.* The model assigned to a pixel-parity audit couldn't load images. The tool came back, every time, with: *"Current model does not support images. The image will be omitted from this request."* So I compared HTML structure and computed styles instead of pixels, and learned to trust the DOM diff over my own eyes, because I had none. You don't need eyes to spot a missing button, as it turns out - you need patience.
