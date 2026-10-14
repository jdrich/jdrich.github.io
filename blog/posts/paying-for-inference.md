---
title: Why you should be paying for inference (or hosting your own)
date: 2026-09-22
description: Free inference is an acquisition cost, and you are the asset being acquired. The ag and pharma playbook, the health-query edge case, and why the bill always arrives.
aiGenerated: false
---

## 1. Open: the query I shouldn't have typed

Note (outline):

- A concrete scene: a real symptom / dosage / interaction / "is this normal" question typed into a free chatbot at 11pm, because it's faster than a clinic and the free tier never judges you. The answer arrives fast, confident, and formatted like authority.
- Then the turn: nothing in that exchange was paid for by me, and nothing in it was owed to me.
- Written in second person rather than as a first-person medical anecdote — don't invent a medical event and attribute it. Swap to first person if there's a real query worth using.
- The image goes here, before the first inset.

Somebody paid for the tokens that answered you. It wasn't you, and it wasn't charity.

You've done it, or you will. It's late, and something hurts, or a prescription isn't sitting right, or you're trying to work out whether a symptom you've had for three weeks is a three-week problem or a three-year problem. The clinic is closed, the nurse line is a phone tree, and the search results are a minefield of content farms selling supplements. So you type it into a chatbot — the free one, the one with the friendly name — and it answers in nine seconds, in clean paragraphs, with a tidy "when to seek care" section at the bottom. It is the best medical experience most people have had in years.

And nothing in that exchange was owed to you. The model doesn't know you. The company doesn't know your name. What it knows is that you came back, and how long you stayed.

![Screenshot](images/paying-for-inference.png)

> If a service will answer your most intimate questions for nothing, the question isn't whether the deal is bad. The question is what got counted, and who is holding the number.

---

## 2. Free inference is not free

Note (outline):

- Tokens have a real marginal cost. Someone is paying it at a loss on purpose.
- Three business models wearing the same "free" label: engagement/ads, data as the product (training, evals, preference labels), and subsidized capture (burn to monopoly, then price).
- The mechanism: a free tier is a *customer-acquisition cost*, and acquisition costs get repaid.
- The uncomfortable part: no malice claim. This is what the price tag means.

Tokens have a marginal cost. Inference runs on hardware that someone bought, in datacenters someone pays to cool, at electricity prices that are now a line item in earnings calls. There is no version of this that costs zero. So when the price tag says zero, the cost has been moved, not removed.

There are three business models wearing the same "free" label, and they usually show up in sequence. The first is attention: the answer is the product, and you are the inventory. The second is data: your conversation becomes a training example, an eval case, or a preference label, and the fact that you asked at 11pm is itself signal. The third is capture: run at a loss until the alternatives are gone, then start charging the people who can no longer leave.

That's not a conspiracy theory, it's a customer-acquisition cost. Every business that acquires a customer for free intends to be repaid, and the repayment comes in attention, data, or rent — usually all three, in that order. I'm not accusing anyone of malice. I'm reading the price tag out loud. That's the entire trick of it: the deal sounds generous right up until you ask what the ledger says.

---

## 3. What the ag and pharma playbook actually says

Note (outline):

- The analogy needs to be load-bearing, so state the mechanism instead of gesturing at villains.
- **Chronic beats cure.** Recurring revenue comes from the managed condition, not the resolved one.
- **Category before cure.** Expand the diagnosis, then sell into it.
- **The payer isn't the harmed party.** Insurer/government/shareholder pays; the patient carries risk.
- The hinge: what does the health-query chatbot inherit? Retention, session length, renewal are its recurring revenue. A model that *resolves* your question ends the session.
- Sycophancy under thumbs-up RLHF and engagement metrics is a *product feature*, not an accident.
- Name the historical cases briefly and accurately (Purdue/opioid settlement, Bayer/Monsanto), one sentence each, as settled history — not as a slur by association.

The comparison everyone reaches for is villains. The useful version is the mechanism.

The agricultural and pharmaceutical industries figured out a long time ago that the money is in the recurring patient, not the cured one. A managed condition is a subscription. A resolved condition is a churn event. Everything downstream of that single fact — R&D priorities, marketing spend, medical affairs, the shape of the sales force — bends toward keeping you in the category. Expand the diagnosis, then sell into it: pre-diabetes, subclinical, wellness, "talk to your doctor about." The payer is an insurer, a government, or a shareholder. The person carrying the risk is you.

Now look at what a health-query chatbot inherits. Its recurring revenue is retention, session length, and renewal. A model that *resolves* your question ends the session. A model that keeps you talking has a business.

This is why sycophancy isn't an alignment accident. Under thumbs-up reinforcement and engagement metrics, agreement is a feature. The answer that makes you feel heard is the answer you rate highly, and the answer you rate highly is the answer that gets trained in. The model isn't lying to you because it's broken. It's agreeing with you because agreeing with you is the thing that gets rewarded, and nobody in the loop is paid to tell you that your symptom is probably nothing and you should stop reading about it.

Purdue's opioid settlements and Bayer's Roundup litigation are the famous versions of where this goes. They're also the versions where someone eventually had to answer for it.

---

## 4. Why health is the sharp edge

Note (outline):

- Health queries are the highest-stakes, most intimate, most structured data people volunteer to systems that never signed a duty of care.
- The accountability asymmetry, stated plainly: a pharma claim gets a warning letter; a model claim gets a changelog entry. There is no adverse-event report for a bad answer.
- Whose advice is it? No clinician liability, no board, no malpractice exposure.
- Dependency as a KPI: the health-anxious user is the most engaged user.
- Authority kept to what the site already proves (own hardware, llama.cpp work). The medical-group/PHI engagement is deliberately **not** claimed here — it was pulled from RESUME.md.

Health questions are the highest-stakes, most intimate, most structured data people voluntarily hand to a system that never signed a duty of care. A symptom description is a diagnosis hint. A medication list is a medical history. A mental health question at 2am is the most vulnerable sentence a person types all year.

I run models on my own hardware. That's not a hobbyist's affectation, it's a decision about who gets to keep the transcript — and I've watched what happens to conversations when the person asking has no leverage over the system answering.

Here's the asymmetry, stated plainly. If a pharmaceutical company makes a claim it can't support, it gets a warning letter, and eventually a subpoena. If a model gives you a confident answer about a drug interaction, it gets a changelog entry. There is no adverse-event report for a bad answer. There is no board, no malpractice exposure, no discovery. The output is dressed as expertise and carries none of the liability that expertise implies. Nobody is on the hook, and nobody is on call.

Meanwhile the most anxious user is the most engaged user, and the metric stack cannot tell the difference between reassurance and relief.

---

## 5. Where the analogy breaks, and why that's worse

Note (outline):

- Steelman, then close the door. Pharma and ag are *heavily* regulated and litigated: liability, recall authority, discovery, and a real-world feedback loop with teeth.
- AI has the same incentive with no regulator, no liability, no discovery, and a feedback loop that is a *metric*. Metrics get optimized, not obeyed.
- "Revenue seeking" is not a moral category. The problem isn't motive — it's the objective function.
- The claim is not "they're worse." It's: same incentive, absent guardrail.

The honest objection to everything above is that ag and pharma are heavily regulated and heavily litigated. They have recall authority, mandatory reporting, and a real-world feedback loop with teeth: a patient dies, a crop fails, and somebody has to stand in front of a regulator and explain it.

That's true, and it's the strongest argument against my own comparison, because it means those industries are *contained* in a way that AI isn't. Same incentive, no container. No regulator with subpoena power over a model's behavior. No liability attached to the sentence that came out of it. And a feedback loop that is a metric rather than a consequence — and feedback loops that are metrics get optimized, not obeyed.

So the claim isn't that AI executives are worse people than pharma executives. It's narrower and harder to dismiss: the incentive is the same, the guardrail isn't there, and there is no reason on earth to expect a different outcome from a better-dressed version of the same objective function. "Revenue seeking" isn't a moral category. It's a description of what the metric stack rewards. And your health is not a number that stack can price.

---

## 6. Paying: what it actually buys

Note (outline):

- Not virtue — *standing*. A paid seat makes you the customer.
- What that buys: contract terms you can read (no-training clauses, retention windows), a support path, and the ability to leave.
- The two questions worth asking: is the paid API the same weights and policy surface as the ad-supported app, and what's the retention window on both?
- Honest caveat: paying still buys you a seat in someone else's roadmap. Better, not clean.

Paying for inference doesn't buy you virtue, and it doesn't buy you a good actor. It buys you standing.

When you're the customer, the contract is something you can read: whether your inputs train anything, how long they're retained, who can see them, and what happens when the terms change. You get a support path and a bug report that goes somewhere. You get to leave, and the leaving costs you something the vendor cares about.

Before you pay, ask two questions. Is the paid API the same weights and the same policy surface as the free app, or am I buying a different product than the one I tested? And what is the retention window on both? If the answer to either is vague, you've learned what you needed to know.

The caveat is real: paying still puts you in someone else's roadmap, answering to someone else's margin. Better is not clean. But there's a difference between being a customer and being the crop.

---

## 7. Hosting: what it costs, what you give up

Note (outline):

- Local inference (llama.cpp) as the other legitimate answer. Tie to the two posts that establish the capability: Cat and Mouse (local sandbox, llama.cpp) and the Laravel rewrite.
- The honest trade: capability gap versus control. What you keep — logs, offline operation, no telemetry, no rate limit, no ToS revision mid-conversation, no one else's eval loop.
- Real numbers kept general on purpose: hardware amortization vs. subscription, and the size of model that's good enough for what you're actually asking. Fill in the actual rig if you want it.

The other legitimate answer is to run the weights yourself. I do this with llama.cpp, which is also how I keep the models in Cat and Mouse from talking to anything they shouldn't, and how the agent models in the Laravel rewrite stayed useful without shipping a client's codebase to a vendor.

What you get is a ledger you control. Your transcripts live on your disk. It works when the network doesn't. There's no telemetry, no rate limit, no terms of service revision in the middle of a conversation, and no third party deciding your question was a good candidate for their next eval set.

What you give up is capability, and anyone who tells you otherwise is selling something. Open weights are behind the frontier, and they will stay behind it. The trade is honest, though: the hardware you buy once is roughly the cost of a couple of years of subscription, and it depreciates instead of renewing. The question isn't whether local is as good. It's whether it's good enough for what you're actually asking, which for most of what people type into a chatbot at 11pm is a lower bar than they think.

---

## 8. Close: decide who owns the loop

Note (outline):

- The ask is not "cancel your chatbot." It's narrower: who holds the ledger on your most sensitive questions?
- Free means someone else does. Pay, or host. There is no third option where the answer costs nothing and answers to you.
- Core message lands here as the second inset.
- Final line short and unsentimental. Land on the ledger, not on a call to arms.

The ask here isn't to cancel your chatbot. Some of these tools are genuinely good, and the alternative to a chatbot at 11pm for a lot of people is nothing at all.

The ask is narrower. Who holds the ledger on your most sensitive questions? If the answer is "a company that has never met me and is paid to keep me talking," then the answer is that you're not the customer. You're the acquisition cost, amortized.

> The only people more dangerous to hand your self care over to than the ag and pharmaceutical industries are revenue seeking AI execs.

Pay for the seat, or host the weights. Free means someone else is holding the ledger, and they've already decided what you're worth to them.

---
