---
title: Some Assembly Required
date: 2026-10-21
description: Now it's Wednesday, two refactors deep, and the AI keeps making the same mistakes
aiGenerated: false
---

Some tasks are still not AI ready out of the box.

Since Friday, I have been working agentically on a pipeline for data format conversion across ~4k files. I thought I would be done Friday afternoon. Now it's Wednesday, two refactors deep, and the AI keeps making the same mistakes:

Despite clear guidance on the target architecture, do/don't paths, and very conservative base prompts, the models I have given this task to (DeepSeek 4.1, Grok, and Sonnet) have continually coded themselves into a spaghettified mess, even after I introduced a plan-do-check flow and added a stronger model (Opus) to keep it on track.

A few observations:

- A single bad path in your git history, an errant markdown file, or in a shared context can completely poison attempts. I forked a session early on where the AI had decided on several completely wrong "facts" about the project and my intentions, and, despite my pruning, those "facts" keep appearing in comments and docs.
- Compaction kills when the problem space is conceptually large. The initial session at one point got so spun in on itself that pi's compaction prompt kept failing on size threshold (maybe a circular reference?), and I had to manually recover the context into a new session.
- Agents are still not good at math. Part of the pipeline conversion is changing a series of vectors from one standard representation to another. There is an extensive spec doc, with examples, of what the before/after looks like, and clear instructions to write a python script to perform the conversion, rather than trying to convert them manually. Every model to this point has dutifully thrown out those instructions and tried to manually convert the vectors, even going so far as to try and convince me that differences of up to 10 degrees during translation are "expected."

Last night, after banging my face on the keyboard for several minutes, I realized that the problem required a more pair programming approach, and much more manual intervention than we expect in the "Late 2026 (But Not Quite Early 2027)" agentic development paradigm. I'm actually going to have to look at code, I'm actually going to have to step through the problem. I'm going to actually need to manually shepherd the agent towards the solution.

Maybe it'll be fun doing the engineering part of software engineering again.
