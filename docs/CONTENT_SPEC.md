# Anatomy Atlas — Content Specification v1

This document is the single source of truth for all educational content. Content agents MUST follow it exactly.
Repo root: `/Users/shanto/Documents/deepseek-harness/default-workspace/anatomy-atlas`

## Product

**Anatomy Atlas** is a free, interactive 3D human anatomy learning platform. Visitors rotate, zoom, and click
through a stylized human body, read authoritative organ entries, take guided lessons, and test themselves with
quizzes. The tone is warm, editorial, and precise — a beautiful science museum, not a hospital pamphlet.

Audience: curious teenagers and adults (reading level roughly grade 8–10). No prior biology assumed.

## Non-negotiable rules

1. **Accuracy first.** Use well-established anatomy/physiology. When in doubt, omit. Never invent numbers.
2. **No medical advice.** Never tell a reader what to do about symptoms. Every condition description is
   educational only. Do not give dosages, treatments, or diagnoses.
3. **Plain, vivid English.** Second person where natural ("Your heart…"). Short sentences. Define jargon on
   first use. No markdown, no HTML, no emoji, no bullet characters inside strings.
4. **US English spelling** (hematology, esophagus, fetus). Metric first, imperial in parentheses when useful.
5. **No duplicated organ IDs across systems.** Use exactly the organ IDs listed in this document.
6. **Valid JSON only.** UTF-8, 2-space indent, double quotes, no trailing commas. Validate before finishing:
   `node -e "JSON.parse(require('fs').readFileSync('src/data/systems/<id>.json','utf8'))"`
7. **Sources must be real, stable pages.** Prefer MedlinePlus, NIH institutes, Cleveland Clinic, Mayo Clinic,
   Britannica, Kenhub, TeachMeAnatomy, Johns Hopkins Medicine, Yale Medicine, CDC, WHO. No Wikipedia, blogs,
   or AI-generated URLs. Verify each source returns HTTP 200 (`curl -s -o /dev/null -w "%{http_code}" -L URL`).

## File layout

One file per system: `src/data/systems/<systemId>.json`.
Review reports: `src/data/reviews/<systemId>.json`.

## System JSON schema

```jsonc
{
  "id": "cardiovascular",                 // exactly one of the 12 IDs in this doc
  "name": "Cardiovascular System",
  "shortName": "Circulatory",             // 1–2 words, used in chips
  "tagline": "The body's never-resting delivery network.", // <= 70 chars
  "summary": "180–240 words, 2–3 paragraphs separated by \n\n. What the system is, what it does, how it works, why it matters.",
  "color": "#b23a4a",                      // system accent (UI)
  "stats": [                               // exactly 3, value + label, no trailing periods
    { "value": "100,000 km", "label": "of blood vessels" },
    { "value": "5 L", "label": "of blood circulating" },
    { "value": "~100,000", "label": "heartbeats per day" }
  ],
  "functions": [                           // 4–6 short strings, <= 95 chars each
    "Delivers oxygen and nutrients to every cell",
    "Carries carbon dioxide and waste to the lungs and kidneys"
  ],
  "organs": [ /* 5–12 organ objects, exactly the IDs listed for this system */ ],
  "lesson": { /* Lesson object — see below */ },
  "quiz": [ /* exactly 8 QuizQuestion objects */ ]
}
```

### Organ object

```jsonc
{
  "id": "heart",                           // exact ID from this doc; globally unique
  "systemId": "cardiovascular",            // must match parent system
  "name": "Heart",
  "latin": "Cor",                          // optional; omit if unsure
  "alsoKnownAs": ["The pump"],             // optional; 0–2 strings
  "region": "thorax",                      // head-neck | thorax | abdomen | pelvis | upper-limb | lower-limb | whole-body
  "tagline": "A tireless four-chambered pump the size of your fist.", // <= 80 chars
  "summary": "110–170 words, exactly 2 paragraphs separated by \n\n. Paragraph 1: what it is, where it sits, what it looks like. Paragraph 2: how it works and why it matters. Vivid but accurate.",
  "functions": [                           // 3–5 objects
    { "title": "Pumps blood", "detail": "One to two sentences. 12–40 words." }
  ],
  "location": "One sentence describing anatomical position relative to landmarks.",
  "size": "One sentence with credible dimensions and/or weight.",
  "facts": [                               // exactly 3 surprising, true facts
    "The heart beats about 100,000 times a day."
  ],
  "conditions": [                          // 2–3 objects; common, well-known conditions only
    { "name": "Coronary artery disease", "description": "One or two educational sentences; no treatment advice." }
  ],
  "relatedOrgans": ["aorta", "coronary-arteries"], // 2–4 existing organ IDs (any system)
  "keywords": ["cardiac", "circulation", "pump", "blood pressure"], // 3–6 lowercase search terms
  "sources": [                             // exactly 2 objects
    { "label": "MedlinePlus — Heart", "url": "https://medlineplus.gov/heart.html" },
    { "label": "Cleveland Clinic — Heart", "url": "https://my.clevelandclinic.org/health/body/21704-heart" }
  ],
  "heroStat": { "value": "100,000", "label": "beats a day" } // optional, value <= 12 chars, label <= 24 chars
}
```

### Lesson object

```jsonc
{
  "id": "lesson-cardiovascular",           // exactly "lesson-" + systemId
  "title": "Follow the blood: a tour of circulation",
  "subtitle": "One line (<= 90 chars) that promises what the reader will understand.",
  "durationMin": 8,                         // 6–12
  "level": "beginner",                     // beginner | intermediate
  "steps": [                               // exactly 8 steps
    {
      "title": "Step title, 2–6 words",
      "body": "90–140 words. Conversational teaching voice. Explain one idea, connect it to the body, and end with a hook to the next step. No markdown.",
      "organId": "heart",                  // optional; must be an organ in this system (omit for intro/recap)
      "keyPoint": "One memorable sentence, <= 110 chars." // optional
    }
  ]
}
```

Step 1 = hook/introduction. Steps 2–7 = guided tour (each ties to an organ). Step 8 = recap + "what to explore next".
At least five steps must include `organId`.

### QuizQuestion object

```jsonc
{
  "id": "cardiovascular-q1",               // "<systemId>-q1" … "-q8"
  "systemId": "cardiovascular",
  "question": "Which chamber pumps oxygen-rich blood to the body?",
  "options": ["Right atrium", "Left ventricle", "Right ventricle", "Left atrium"], // exactly 4
  "answerIndex": 1,                        // 0–3
  "explanation": "The left ventricle has the thickest wall because it pushes blood through the aorta to the whole body.", // 20–50 words
  "difficulty": "easy"                     // easy | medium | hard; use 3 easy, 3 medium, 2 hard
}
```

Questions must be answerable from the file's own content, have exactly one correct answer, plausible distractors,
and no "all of the above"/"none of the above". Vary which index is correct.

## Systems and required organ IDs (exact, in order)

### 1. skeletal — Skeletal System
Organs: `skull`, `mandible`, `vertebral-column`, `ribcage`, `sternum`, `pelvis`, `femur`, `humerus`, `radius-ulna`, `scapula`, `clavicle`, `patella`
Color: `#8a6f45`

### 2. muscular — Muscular System
Organs: `deltoid`, `pectoralis-major`, `rectus-abdominis`, `trapezius`, `biceps-brachii`, `gluteus-maximus`, `quadriceps`, `hamstrings`, `gastrocnemius`, `diaphragm`
Color: `#b5523b`

### 3. nervous — Nervous System
Organs: `brain`, `cerebellum`, `brainstem`, `hypothalamus`, `hippocampus`, `amygdala`, `spinal-cord`, `peripheral-nerves`, `sciatic-nerve`, `meninges`
Color: `#c9973f`

### 4. cardiovascular — Cardiovascular System
Organs: `heart`, `aorta`, `coronary-arteries`, `arteries`, `veins`, `capillaries`, `vena-cava`, `pulmonary-arteries`
Color: `#b23a4a`

### 5. respiratory — Respiratory System
Organs: `lungs`, `trachea`, `bronchi`, `bronchioles`, `alveoli`, `larynx`, `pleura`
Color: `#6a8f8b`

### 6. digestive — Digestive System
Organs: `mouth`, `salivary-glands`, `esophagus`, `stomach`, `liver`, `gallbladder`, `pancreas`, `small-intestine`, `large-intestine`, `rectum`
Color: `#9a6b3f`

### 7. endocrine — Endocrine System
Organs: `pituitary-gland`, `thyroid`, `parathyroid`, `adrenal-glands`, `pineal-gland`, `pancreatic-islets`
Color: `#8a5a8f`

### 8. immune — Immune & Lymphatic System
Organs: `thymus`, `spleen`, `lymph-nodes`, `tonsils`, `bone-marrow`, `lymphatic-vessels`
Color: `#6f8a4f`

### 9. urinary — Urinary System
Organs: `kidneys`, `ureters`, `bladder`, `urethra`, `nephrons`
Color: `#5c7a9e`

### 10. reproductive — Reproductive System
Organs: `ovaries`, `fallopian-tubes`, `uterus`, `vagina`, `testes`, `prostate`, `penis`, `mammary-glands`
Color: `#a66a7a`

### 11. integumentary — Integumentary System
Organs: `skin`, `hair`, `nails`, `sweat-glands`, `sebaceous-glands`, `subcutaneous-fat`
Color: `#c99a76`

### 12. sensory — Sensory Organs
Organs: `eyes`, `ears`, `nose`, `tongue`, `retina`, `cochlea`, `vestibular-system`
Color: `#7a9bc4`

## Voice reference samples

Good: "Your lungs are not hollow balloons. They are dense, spongy organs packed with roughly 300 million tiny air sacs, each wrapped in a net of capillaries thinner than a hair."

Bad: "The lungs are a respiratory organ that facilitates gas exchange via alveoli." (too clinical, no imagery)

Good condition line: "Asthma narrows the small airways, making exhaling feel like breathing through a straw."

Bad: "Take two puffs of albuterol when symptoms start." (medical advice — forbidden)

## Lesson voice

Write like a brilliant museum guide talking to one curious person. Use concrete comparisons (a fist, a tennis court, a
garden hose). Every step ends with a small forward pull. No headers, no bullets, no "In this lesson…" filler.

## Acceptance checklist

- [ ] File parses as JSON; keys/types exactly as specified.
- [ ] Exactly the required organ IDs, in order, each with `systemId` matching the file.
- [ ] Every organ has all required fields; summaries 110–170 words; exactly 3 facts; 2–3 conditions; 2 sources.
- [ ] Exactly 8 lesson steps with >= 5 valid `organId`s; lesson id `lesson-<systemId>`.
- [ ] Exactly 8 quiz questions, ids `<systemId>-q1..q8`, 4 options, valid answerIndex, explanation.
- [ ] All `relatedOrgans` IDs exist somewhere in this doc.
- [ ] Sources verified HTTP 200 and on the allowlist.
- [ ] No medical advice, no markdown, no emoji, no duplicated organ IDs.
