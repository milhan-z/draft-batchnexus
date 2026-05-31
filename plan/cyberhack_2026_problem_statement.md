# CyberHack 2026 — Problem Statement

**Challenge Partner:** Sima Arome  
**Theme:** AI and technology innovation for manufacturing operations  
**Powered by:** Hackpad

---

## Table of Contents

1. [Background & Context](#background--context)
2. [Core Challenge](#core-challenge)
3. [Focus Areas](#focus-areas)
4. [Important Points & Deadlines](#important-points--deadlines)
5. [Participant Requirements](#participant-requirements)
6. [Submission Requirements](#submission-requirements)
7. [Pitch Deck Outline](#pitch-deck-outline)
8. [Judging Criteria](#judging-criteria)
9. [Prize Pool](#prize-pool)
10. [Final Round](#final-round)
11. [Finalist Obligations](#finalist-obligations)
12. [Submission Checklist](#submission-checklist)

---

## Background & Context

### Sima Arome

**Sima Arome** is an Indonesian natural extracts manufacturer that supports brands across the **food & beverage**, **cosmetics**, and **wellness** industries.

**Brand positioning:** *The Natural Scent Creator*  
**Business type:** Natural extracts manufacturer for F&B, cosmetics, and wellness brands.

---

## The Operation

Sima Arome runs an end-to-end extract production process. The operation starts when incoming raw materials are stored in the warehouse. These raw materials are then cleared by Quality Control (QC), queued by PPIC for scheduled production, assigned lot numbers, processed into finished goods, mapped onto a warehouse floor plan, and eventually shipped as samples to local and export customers.

Across this chain, several operational problems appear:

- Manual QC processes create dependency on trained staff.
- Double data entry between systems slows down work and increases the risk of errors.
- Storage decisions are still made using spreadsheets.
- Production knowledge is often stored in people’s heads rather than in reliable software.

As a result, the workflow can experience slowdowns, rework, missed batches, and limited operational visibility.

---

## Key Challenges

### 1. Fragmented Systems

Operators re-enter the same data into multiple tools. This creates slow, error-prone, and blame-prone workflows.

### 2. Manual QC Bottleneck

Colour and powder quality checks rely heavily on trained human eyes. Throughput can stall when qualified staff are unavailable.

### 3. Storage by Spreadsheet

Drum placement, hazard segregation, and cold-chain storage requirements are tracked using files instead of integrated systems.

Cold-chain requirements include temperatures between **-4°C and -20°C**.

### 4. Production Opacity

PPIC schedules, lot histories, and sample dispatches are spread across notebooks, spreadsheets, chats, and informal records.

---

## Core Challenge

> **How can AI and technology innovate Sima Arome’s manufacturing process?**

The challenge asks participants to design and build a technological solution that improves Sima Arome’s manufacturing workflow, especially in areas such as operations integration, quality control, warehouse management, production tracking, and enterprise readiness.

---

## Focus Areas

Teams may choose one focus area or combine multiple focus areas into a single solution.

| No. | Focus Area | Description |
|---:|---|---|
| 01 | **Integrated Operations System** | Build one source of truth that connects supplier intake, warehouse, QC, PPIC scheduling, lot tracking, and dispatch. The goal is to eliminate repeated manual input across notebooks, spreadsheets, and apps. |
| 02 | **AI for Fruit & Raw-Material QC** | Use computer vision to grade incoming fruit and botanical inputs based on ripeness, colour, defects, and foreign matter. The goal is to make inspection faster, more consistent, and more auditable than manual checking. |
| 03 | **AI for Extract & Powder QC** | Use visual or sensor-based checks to inspect extract powder for colour, consistency, and contamination. The system should help flag out-of-spec lots before packing and shipping. |
| 04 | **AI-Assisted Warehousing & Cold-Chain** | Create smart warehouse slotting based on floor plans, hazard segregation for IBC/IPPC drums, and cold-chain monitoring from **-4°C to -20°C** to prevent degradation or misplaced goods. |

---

## Important Points & Deadlines

| Date | Milestone |
|---|---|
| **May 25, 2026** | Problem Statement Released |
| **May 31, 2026** | Submission Deadline |
| **June 2, 2026** | Finalist Announcement |
| **June 3–4, 2026** | Finalist Mentoring |
| **June 6, 2026** | Finals Presentation |

> Submissions and finals are non-negotiable. Teams should prepare all required materials before the deadline.

---

## Participant Requirements

| Requirement | Details |
|---|---|
| **ITS Student** | Open to all current ITS students across faculties. |
| **Team Size** | Teams may consist of **1 to 4 members**. Solo participants are welcome. Cross-major teams are encouraged. |
| **Committee Restriction** | Participants must not be part of the organising committee. This is a conflict-of-interest rule and will be strictly enforced. |

---

## Submission Requirements

Submissions must be made through the official submission link. Teams may also post their project on Devpost for extra visibility, but Devpost submission is optional.

| No. | Item | Status | Requirements |
|---:|---|---|---|
| 01 | **GitHub Repository** | Optional | Public link. Include screenshots, installation steps, and usage instructions in the README. |
| 02 | **Demo Video** | Required | Maximum **3 minutes**. Upload to YouTube or Vimeo. The video must show the prototype running, not just presentation slides. |
| 03 | **Pitch Deck** | Required | Submit as PDF or ZIP. Follow the pitch deck outline provided in the problem statement. Keep the deck visual and concise. |
| 04 | **Live Demo Link** | Required | Deploy through BuildPad or a prototype URL such as Vercel or Netlify. It is strongly encouraged to use BuildPad. |

### Submission Reminders

- Official submission link is compulsory.
- Devpost is optional.
- Only one team member needs to submit.
- Submission must be in English only.
- Deadline: **23:59 WIB, 31 May 2026**.
- It is strongly encouraged to use **BuildPad** for deployment or prototype submission.

---

## Pitch Deck Outline

The pitch deck should tell the story of the idea, not only explain the code.

| Slide | Section | Purpose |
|---:|---|---|
| 01 | **Problem Statement** | Explain the specific, relatable pain point or challenge your project addresses. |
| 02 | **The Solution** | Introduce the product clearly and concisely, including how it directly solves the problem. |
| 03 | **Value Proposition** | Explain what makes the solution unique, effective, and better than existing alternatives. |
| 04 | **Product Demo** | Include a live walkthrough, screenshots, or screen recording that shows the core user flow and key features. |
| 05 | **Technical Architecture** | Present a high-level overview of the tech stack, system design, pipelines, integrations, APIs, or unique technical implementation. |
| 06 | **Target Audience & Impact** | Define the end users and explain the measurable impact or scale of the solution. |
| 07 | **Business Viability** | Explain how the project can be sustained, scaled, or monetised in the real world. |
| 08 | **Future Roadmap** | Show the next logical steps, such as upcoming features, beta testing, or scaling plans. |
| 09 | **The Team** | Introduce the team members and their core competencies. |
| 10 | **Call to Action (CTA)** | End with a clear next step, such as scanning a QR code, reviewing the GitHub repository, or supporting the next phase. |

---

## Judging Criteria

The total score is **100%**, divided into five criteria.

| No. | Criteria | Weight | Description |
|---:|---|---:|---|
| 01 | **Enterprise Readiness** | 30% | Measures how production-ready the solution is, including audit trails, RBAC, policy enforcement, security, scalability, and clean documentation. |
| 02 | **Problem-Solution Fit** | 20% | Measures how well the solution addresses the official problem statement, shows understanding of the business problem, and communicates a clear value proposition. |
| 03 | **Innovation & Creativity** | 20% | Measures originality of approach, novel use of technology, and creative thinking beyond obvious solutions. |
| 04 | **User Experience & Design** | 20% | Measures usability, interface design, and how intuitive the solution is for intended users, including admin and operator experiences. |
| 05 | **Pitch & Presentation** | 10% | Measures the clarity and persuasiveness of the pitch deck and demo video, especially how well the team communicates problem, solution, and enterprise impact. |

### Enterprise Readiness Tip

Use **BuildPad** to help ensure that the solution is enterprise-ready out of the box. Bonus points are awarded for this.

---

## Prize Pool

Total prize pool:

- **12 million IDR**
- Up to **10 million IDR AWS credits**
- **XTREMAX career fast-track** opportunity

| Award | Prize |
|---|---:|
| **1st Place** | 5,000,000 IDR |
| **2nd Place** | 3,000,000 IDR |
| **3rd Place** | 2,000,000 IDR |
| **Special Award: Most Enterprise-Ready Solution** | 2,000,000 IDR |

### 1st Place Additional Benefit

The grand prize winner receives an **XTREMAX interview fast-track**.

---

## Final Round

The final round will be held on-site at ITS Surabaya with live pitching, live judging, and an awards ceremony.

| Item | Details |
|---|---|
| **Venue** | ITS Surabaya · Gedung Tower 2 |
| **Date** | Saturday, 6 June 2026 |
| **Time** | 10:00 – 16:00 WIB |
| **Format** | On-site pitching, live Q&A, and awards ceremony |

---

## Finalist Obligations

Finalists will be selected on **2 June 2026**.

Selected finalists must follow these obligations:

1. Confirm attendance within **24 hours** of the finalist announcement. Failure to respond may result in disqualification and replacement.
2. At least **50% of each team** must attend in person.
3. Teams may perform a live demo or show a pre-recorded demo if their stack cannot run on the venue Wi-Fi.
4. Finalists should sign up for and use the **1:1 mentoring slots** offered on **3–4 June 2026**.

---

## Submission Checklist

Use this checklist before submitting the project.

### Required

- [ ] Demo video is uploaded to YouTube or Vimeo.
- [ ] Demo video is maximum 3 minutes.
- [ ] Demo video shows the prototype running, not only slides.
- [ ] Pitch deck is completed.
- [ ] Pitch deck is exported as PDF or ZIP.
- [ ] Live demo link is ready.
- [ ] Live demo is deployed through BuildPad, Vercel, Netlify, or another prototype URL.
- [ ] All submission materials are in English.
- [ ] One team member submits through the official submission link.
- [ ] Submission is completed before **23:59 WIB, 31 May 2026**.

### Optional but Recommended

- [ ] GitHub repository is public.
- [ ] README includes screenshots.
- [ ] README includes installation steps.
- [ ] README includes usage instructions.
- [ ] Project is also posted on Devpost for extra visibility.
- [ ] Solution uses BuildPad to improve enterprise readiness.
- [ ] Documentation explains audit trails, RBAC, security, scalability, and deployment flow.

---

## Recommended Solution Framing

For a strong CyberHack 2026 submission, teams should frame their solution around real operational value for Sima Arome.

A strong project should answer these questions clearly:

1. **What exact manufacturing pain point does the solution solve?**
2. **Who uses the product?** For example: warehouse staff, QC staff, PPIC, admin, or management.
3. **What workflow becomes faster, safer, or more accurate?**
4. **Where does AI add value?** For example: visual inspection, anomaly detection, decision support, smart slotting, or automated documentation.
5. **How is the system enterprise-ready?** For example: audit logs, roles and permissions, data traceability, secure access, and scalable architecture.
6. **How can the solution be deployed in a real manufacturing environment?**

---

## Possible Project Directions

Below are possible directions based on the official focus areas.

### Direction 1: Integrated Manufacturing Dashboard

A centralized system for supplier intake, QC approval, PPIC scheduling, lot tracking, inventory status, and dispatch records.

Potential features:

- Supplier intake form
- Raw material registration
- QC approval flow
- Lot number generation
- Production queue
- Warehouse location mapping
- Dispatch tracking
- Role-based access control
- Audit logs

### Direction 2: AI Raw Material Grading

A computer vision prototype that helps QC staff grade fruit or botanical inputs.

Potential features:

- Image upload or camera capture
- Ripeness detection
- Colour analysis
- Defect detection
- Foreign matter flagging
- QC report generation
- Confidence score
- Human verification flow

### Direction 3: AI Powder Quality Inspection

A visual or sensor-assisted system for checking extract powder quality before packaging and shipping.

Potential features:

- Powder image capture
- Colour consistency analysis
- Contamination flagging
- Out-of-spec warning
- Lot-level QC record
- QC comparison history
- Exportable inspection report

### Direction 4: Smart Warehouse & Cold-Chain Monitoring

A warehouse assistant for drum placement, hazard segregation, and cold-chain monitoring.

Potential features:

- Digital warehouse floor plan
- Smart slot recommendation
- Hazard segregation rules
- Cold-chain temperature monitoring
- Temperature alert system
- Storage location history
- Finished goods tracking
- Misplacement prevention

---

## Notes for Teams

To score well, teams should not only build a working prototype but also clearly show how the solution fits Sima Arome’s real workflow.

The strongest submissions will likely combine:

- Clear understanding of Sima Arome’s operational problems
- Practical AI or automation use case
- Clean and intuitive user experience
- Production-oriented system design
- Strong documentation and demo video
- Clear pitch about measurable business impact

---

## Source

Converted from the uploaded presentation file:

**`Copy of Problem Statement(1).pptx`**
