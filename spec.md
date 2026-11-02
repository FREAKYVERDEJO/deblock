# deblock — MVP product specification

**Status:** Draft for human review  
**Date:** 2026-11-02  
**Owner:** Project creator  
**Product type:** Creative-writing and language-exploration tool  
**Scope:** First testable version, not the full product vision

## 1. Why

Writers can become stuck not only because they lack ideas, but also because beginning, sustaining, or evaluating their writing feels difficult. The project's starting point is a first-person account in the project journal: prolonged writer's block, dissatisfaction with conventional advice, and an interest in exploring personal associations with language through writing.

**deblock** offers a place to start writing without having to produce a polished piece. Instead of composing text for the writer, it presents small, open-ended exercises that invite the writer to follow words, connections, and unexpected associations. The first exercise, **The Signifier Chain**, is inspired by free association and by the importance of signifiers in Lacanian thought; it is a creative activity, **not psychoanalysis or psychotherapy**.

### Research basis and limits

- **Writer's block is not one uniform problem.** Ahmed and Güss (2022) surveyed 146 writers and identified physiological, motivational, cognitive, and behavioral contributors. Respondents described multiple strategies, not one universal solution. This supports offering a choice of exercises eventually, but does not establish that deblock will work. [R1]
- **Low-stakes writing is a recognized starting strategy.** Purdue OWL and George Mason University's Writing Center describe brainstorming, uncensored writing, and freewriting as ways to begin. These are educational recommendations, not deblock-specific efficacy studies. [R2, R3]
- **Associative prompts are a plausible creative mechanism.** In experimental idea-generation tasks, word recommendations influenced fluency and originality, with different effects for novice and experienced writers (2024). The task studied was not deblock and does not prove its effectiveness. [R4]
- **The psychoanalytic inspiration has limits.** The APA defines free association as a technique used in psychoanalysis and psychodynamic psychotherapy. Stanford's overview of Lacan discusses signifying chains. A self-directed writing exercise cannot infer unconscious causes or make clinical interpretations. [R5, R6]
- **Do not promise mental-health benefits.** A 2025 systematic review of positive expressive writing found more consistent evidence for some wellbeing outcomes than for mental-health outcomes, and rated study quality poor or fair. deblock's primary outcome is **writing initiation**, not symptom reduction. [R7]

**What is known about demand:** The project journal establishes the creator's own unmet need. It does *not* yet establish market size, paying demand, or effectiveness among other writers. These remain questions for research with real prospective users.

## 2. Who

**Primary audience:** Adults who write poetry, fiction, journals, or other personal creative work and feel unable to begin or continue, particularly those who find generic prompts, productivity targets, or pressure to produce polished work unhelpful.

**Early test segment:** Adult creative writers who self-identify as currently blocked and are willing to try a short, private language-association exercise.

**Secondary, later audiences:** Writing students, curious language enthusiasts, and writers who want a reflective practice without describing themselves as blocked.

The product is **not** designed for clinicians to diagnose patients or for people seeking mental-health treatment.

## 3. Problem

When a writer faces an empty page, they may be unable to move from thought to text. An open-ended instruction such as "just write" may be insufficient. The writer needs an accessible first action that is small, clear, nonjudgmental, and centered on their own words.

**Problem statement:** Adults experiencing creative writer's block need an approachable way to begin producing text and exploring unexpected associations, because the pressure to generate a worthwhile finished piece can prevent them from starting at all.

**Assumption to test:** A short, clearly explained, low-pressure association exercise will help more blocked writers begin writing than simply presenting them with an empty page.

## 4. Product bet and requirements

**Bet:** If a blocked writer receives an approachable free-association exercise with an optional reflective ending, they can begin writing promptly and may notice new connections worth exploring.

The first version must let a writer:

1. See an available writing exercise and understand its purpose before starting.
2. Request an exercise using its known identifier and receive its title and usable instructions.
3. Follow **The Signifier Chain** without being graded, corrected, or interpreted by the product.
4. Enter an original response in their own words, with permission to skip a step or stop.
5. Finish or leave a session without the product presenting a psychological verdict about their writing.
6. Receive a clear, non-punitive error when an exercise is unavailable.
7. Know whether their text will be retained before they enter anything personal; text must never be made public by default.

### First exercise: The Signifier Chain

**Exercise identifier:** `free_association`  
**Exercise title:** `The Signifier Chain`

**Proposed participant-facing instructions (original draft):**

> Begin with a word that is on your mind. Write the next word it brings up, without searching for a clever answer. Continue for ten links, allowing sounds, memories, contradictions, and apparently unrelated ideas. Then, if you wish, choose one link that surprised you and write two or three sentences about it. You may stop, skip the reflection, or change your starting word at any time. There is no correct interpretation.

This specific instruction text is a *proposed creative design*, not a researched or clinically validated protocol. The title and identifier, however, come from the project's original acceptance criteria.

## 5. MVP scope

**In scope for the first testable release:**

- One complete exercise: **The Signifier Chain**.
- A clear exercise-selection or request experience.
- Exercise name, purpose, instructions, and a place to write.
- A way to finish or leave without penalty.
- Clear handling of unknown exercise identifiers.
- Clear privacy expectations and nonclinical language.
- Simple, consent-based evaluation of whether first-time users can start writing and find the exercise worthwhile.

**Possible next increment, only if user testing supports it:** A small library of distinct exercise types (e.g., freewriting, word association, constraint-based prompts) and optional reflection/history. No new feature should be added merely because it is easy for an agent to build.

## 6. Acceptance criteria

The two acceptance criteria below are preserved from the project journal.

### AC1 — Retrieve a writing exercise

- **Given** a writer wants a free-association exercise,
- **When** they request the exercise `free_association`,
- **Then** the application returns **"The Signifier Chain"** with instructions for the exercise.

### AC2 — Handle an invalid exercise

- **Given** a writer requests an exercise,
- **When** the requested exercise ID does not exist,
- **Then** the application rejects the request with a clear error.

The following are **new, proposed** criteria for the first usable writing experience.

### AC3 — Begin writing without evaluation

- **Given** a writer has opened The Signifier Chain,
- **When** they begin entering associations,
- **Then** they can write freely and are not corrected, scored, diagnosed, or interrupted with generated interpretations.

### AC4 — Exit voluntarily

- **Given** a writer has opened an exercise,
- **When** they choose to stop or skip its optional reflection,
- **Then** they can leave without punishment or an implied failure.

### AC5 — Understand privacy before writing

- **Given** a writer opens an exercise,
- **When** they are about to enter personal writing,
- **Then** they can understand whether their text will be retained or shared, and no public sharing happens without their deliberate choice.

## 7. Success

The product has **no observed baseline yet**. The following are **pilot targets**, not evidence that deblock already achieves them.

**Primary metric — writing-start rate:** Among at least **10 consenting adult pilot participants who self-identify as blocked**, at least **7 of 10** enter their first original word within **two minutes** of opening the exercise. Measure elapsed time from opening the exercise to first writing; do not require reading the content.

**Supporting metric — perceived usefulness:** At least **7 of 10** pilot participants answer **4 or 5 out of 5** to: "This exercise helped me get started writing." Record nonresponse separately.

**Guardrails:**

- No writing is published or transmitted to another person without an explicit user action.
- No participant is told the app has diagnosed their block or uncovered an unconscious truth.
- At least **9 of 10** participants correctly explain, after the session, what happens to their writing when they leave.

**Reconsideration / kill criterion:** If fewer than **5 of 10** pilot participants start writing within two minutes, or at least **4 of 10** report that the exercise increased pressure to write, revisit the core experience before expanding the product. These thresholds are provisional design decisions, not statistically reliable proof from such a small sample.

**Measurement principle:** Observe simple user actions and obtain voluntary feedback; avoid collecting private writing content to calculate engagement metrics. Do not use simulated-persona results as real-user evidence.

## 8. Out of scope

The MVP will **not**:

- Diagnose writer's block, trauma, mental-health conditions, personality, or unconscious motives.
- Provide psychotherapy, therapist-style interpretations, or claims of clinical effectiveness.
- Automatically analyze a person's writing to infer sensitive demographic traits or psychological attributes.
- Write poems, stories, or interpretations on the user's behalf.
- Include a public poetry feed, reviews, social network, gamified streaks, or a marketplace.
- Automatically share writing with a psychoanalyst or any third party.
- Include payments, subscriptions, or a full multi-exercise curriculum.

These exclusions keep the initial product focused and prevent personal creative exploration from being mistaken for clinical assessment.

## 9. Product directive — owned by the human

**deblock exists to help people begin writing and explore their own relationship to language. It must preserve the user's authorship, freedom to stop, and control over personal text. Its value is measured by whether writers can start and find the process useful—not by how polished, productive, or psychologically revealing the output appears.**

Non-negotiable constraints:

1. The user writes; the product does not replace their voice.
2. Exercises are invitations, never tests of mental health or creative worth.
3. Personal writing is private by default; any sharing requires a deliberate choice.
4. The product never claims to uncover a person's unconscious truth.
5. Changes to these constraints require explicit approval by the project owner.

## 10. Evidence still needed / open decisions

- Interview **5–8** prospective users about the moments they feel blocked and strategies they have already tried. Do not treat the creator's experience as representative.
- Compare a blank-page experience with The Signifier Chain in a small pilot; use the same start-time definition for both.
- Find out whether writers want saving/exporting, how they understand privacy, and whether an optional reflection helps or feels invasive.
- Test whether different writing forms (poetry vs fiction) need different prompts.
- Determine which languages the first release should support.
- Define a content-retention policy before collecting real user writing.

## 11. Research sources

The sources below establish context and boundaries. None tests deblock itself.

- **[R1]** Ahmed, S. J., & Güss, C. D. (2022). *An Analysis of Writer's Block: Causes and Solutions.* Creativity Research Journal, 34(3), 339–354. https://doi.org/10.1080/10400419.2022.2031436
- **[R2]** Purdue Online Writing Lab. *Symptoms and Cures for Writer's Block.* https://owl.purdue.edu/owl/general_writing/the_writing_process/writers_block/
- **[R3]** George Mason University Writing Center. *Writer's Block.* https://writingcenter.gmu.edu/writing-resources/writing-as-process/writers-block
- **[R4]** *Sparking creativity: Encouraging creative idea generation through automatically generated word recommendations* (2024). Behavior Research Methods. https://doi.org/10.3758/s13428-024-02463-8
- **[R5]** American Psychological Association, APA Dictionary of Psychology. *Free association* (updated 2023). https://dictionary.apa.org/free-association
- **[R6]** Stanford Encyclopedia of Philosophy. *Jacques Lacan.* https://plato.stanford.edu/entries/lacan/
- **[R7]** Hoult, L. M., et al. (2025). *Positive expressive writing interventions, subjective health and wellbeing in non-clinical populations: A systematic review.* PLOS ONE. https://doi.org/10.1371/journal.pone.0308928

### Existing products reviewed (positioning, not evidence of demand)

- **750 Words:** Private daily writing, word goals, and streaks; deblock should prioritize exploratory starting points rather than daily volume. https://www.750words.com/
- **Squibler's Dangerous Writing App:** Time/word targets and deliberate pressure to keep typing; deblock deliberately takes the opposite, non-punitive approach. https://www.squibler.io/dangerous-writing-prompt-app

**Internal source:** Project journal, 2026-10-27 (deblock idea, first-person user story, and AC1–AC2).  
**Research checked:** 2026-11-02.
