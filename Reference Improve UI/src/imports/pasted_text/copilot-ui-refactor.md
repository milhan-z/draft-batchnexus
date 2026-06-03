Refine the current global Floating Ops Copilot UI.

Problem:
The current Copilot overlay feels like a large popup/modal chat page. It covers too much of the screen, looks rectangular and static, and does not feel like a dynamic Siri/Google Assistant-style assistant.

Goal:
Transform it into a dynamic, ambient assistant layer similar to Siri / Google Assistant, but still enterprise-ready for BatchNexus. The assistant should feel lightweight, contextual, floating, and fluid — not like a full-page popup.

Keep these enterprise rules:
- Answers are generated from operational records.
- Show source records when relevant.
- Suggested actions must require human confirmation.
- No automatic QC approval, slot assignment, blocking, or export.
- Important Copilot queries should still be audit-logged.
- Keep BatchNexus visual identity: warm off-white, botanical green, soft borders, rounded cards, calm enterprise UI.

MAIN UI CHANGES

1. Replace the large modal/popup with an ambient assistant dock.
Current issue:
- The panel takes almost the whole width and height.
- It feels like a normal chat app.

New behavior:
- Floating Copilot starts as a circular glowing assistant orb at bottom-right.
- When clicked, it expands into a compact bottom-centered command dock, not a full modal.
- The dock should feel like a Siri/Google Assistant command layer.

Default closed state:
- Bottom-right floating orb.
- Size around 56x56.
- Botanical green.
- Subtle soft glow.
- Icon: sparkles / assistant.
- Tooltip label: "Ask Ops Copilot".

Expanded input state:
- A bottom-centered pill-shaped command bar.
- Width: min(760px, calc(100vw - 32px)).
- Height around 64–76px.
- Border radius: 999px.
- White/soft surface with botanical green border/glow.
- Slight backdrop blur.
- It should float above the page content, not cover the whole screen.
- Keep the page visible behind it.

Visual example:
[ ✨ Ask about lot, QC, warehouse, dispatch, or audit...              ↑ ]

2. Do not show a huge header by default.
Current issue:
- Header takes too much space: "BatchNexus Ops Copilot", page, role, clear, close.
New behavior:
- In compact mode, show only the input pill.
- Page/role context should appear as tiny chips above the input only when expanded:
  [Page: Warehouse] [Role: Warehouse Admin] [Context: LOT-2026-051]
- No big top header unless the user expands details.

3. Use dynamic assistant cards instead of a large response panel.
Current issue:
- Response is shown inside a large bordered rectangle.
New behavior:
- After user asks a question, show a floating response card above the command dock.
- Response card should be compact, like Google Assistant result card.
- Width: same as dock or max 760px.
- Max height: 360px with internal scroll only if needed.
- Rounded corners: 24px.
- Soft shadow.
- White/soft cream background.
- Do not cover the whole page.

Response card structure:
- Small assistant label row:
  ✨ Ops Copilot · From operational records
- Main answer section.
- Optional source chips.
- Optional suggested action buttons.
- Tiny safety note:
  "Actions require confirmation and are audit-logged."

4. Use layered animation.
Implement these interaction states:
- closed: floating orb
- listening/input: orb morphs into command dock
- thinking: animated sparkle / soft pulse inside dock
- answered: response card rises above dock
- dismissed: response card fades, dock remains or collapses

Animation direction:
- Smooth scale and fade.
- Bottom-up slide.
- No harsh modal transition.
- Avoid dark overlay that blocks the page.
- Background can have very subtle blur only behind the card, not full-screen blocking.

5. Improve prompt chips.
Current issue:
- Prompt chips take a full row and make it feel like a normal chat page.
New behavior:
- Show prompt chips as a horizontal scroll row above the input dock.
- Chips should be compact and optional.
- Hide chips after user submits a query.
- Route-based prompt chips:
  Dashboard:
  - Any cold-chain alerts?
  - What needs attention?
  - Summarize today
  - Which lots are blocked?
  Warehouse:
  - Why this slot?
  - Why is COLD-B blocked?
  - Assign recommended slot
  - Any cold-chain alerts?
  QC:
  - Explain AI QC score
  - What should I review?
  - What happens if I approve?
  Lots:
  - Where is this lot?
  - Show full timeline
  - Which samples used this lot?
  Audit:
  - Explain integrity hash
  - Show QC approvals
  - Export compliance report

6. Response card types.
The assistant should support multiple dynamic card types:

A. Text answer card
For simple questions.

B. Alert result card
For cold-chain alerts or policy violations.
Example:
- Title: "1 cold-chain alert"
- Detail: "FRZ-C recorded -3°C, outside the required -20°C to -4°C range."
- Source chips: Warehouse zones, Temperature readings
- Actions: Open warehouse, Open audit log

C. Record result card
For lot/receipt/QC answers.
Example:
- LOT-2026-051
- Status: Stored
- Location: HAZ-D-04
- Material: Citrus Peel Extract
- Actions: Open lot timeline, Open warehouse

D. Suggested action card
For operational actions.
Example:
- Suggested action: Assign LOT-2026-051 to HAZ-D-04
- Note: "Human confirmation required before inventory movement."
- Button: Review & confirm
Never execute directly.

7. Make action buttons compact and contextual.
Current issue:
- Action buttons look like normal page buttons.
New behavior:
- Use compact assistant action buttons.
- Primary: botanical green.
- Secondary: white with border.
- Buttons should be inside the response card, not in a full modal footer.
- Labels:
  - Open warehouse
  - Open lot timeline
  - Open audit log
  - Review & confirm
  - Generate summary

8. Keep the page usable.
The assistant must not block dashboard cards or warehouse UI.
Rules:
- No full-screen overlay.
- No fixed panel from top to bottom.
- No large header bar.
- The user must still see and interact with the page.
- The assistant floats above the page as a temporary command layer.

9. Visual design requirements.
Use:
- rounded pill input
- 24px rounded response cards
- soft shadow
- subtle green glow
- white/cream surfaces
- botanical green primary
- muted gray text
- compact chips
- assistant sparkle icon
- calm enterprise style

Avoid:
- full modal
- huge chat window
- dark overlay
- neon
- cyberpunk
- clutter
- large empty spaces
- full-width panel
- looking like a separate Copilot page

10. Layout specs.

Closed orb:
- position: fixed
- right: 24px
- bottom: 24px
- width/height: 56px
- z-index high
- border-radius: 999px

Expanded dock:
- position: fixed
- left: 50%
- transform: translateX(-50%)
- bottom: 24px
- width: min(760px, calc(100vw - 32px))
- min-height: 64px
- border-radius: 999px
- z-index high

Prompt chips row:
- position: fixed
- bottom: 104px
- centered with same max width
- horizontal scroll
- only visible when dock is open and no response is active

Response card:
- position: fixed
- left: 50%
- transform: translateX(-50%)
- bottom: 112px
- width: min(760px, calc(100vw - 32px))
- max-height: 360px
- overflow-y: auto
- border-radius: 24px
- z-index high

Mobile:
- orb: bottom-right, 20px
- dock: bottom 16px, width calc(100vw - 24px)
- response card: bottom 96px, width calc(100vw - 24px), max-height 55vh
- chips row: bottom 92px if no response

11. Copy updates.
Input placeholder:
"Ask about lot status, QC, warehouse, dispatch, or audit..."

Assistant label:
"Ops Copilot"

Safety note:
"Answers are generated from operational records. Actions require confirmation."

Thinking text:
"Searching operational records..."

Empty helper:
"Ask a question or choose a suggested prompt."

12. Implementation notes.
- Keep existing intent logic if already implemented.
- Keep existing source cards and action handlers.
- Refactor only the visual container and interaction states.
- Do not remove the dedicated Ops Copilot page.
- Global Floating Copilot should be a lightweight overlay available on every main page.
- Keep audit logging for Copilot query.
- Make sure ESC closes response/dock.
- Clicking outside should close response card but not necessarily remove the orb.

Acceptance criteria:
- The assistant no longer looks like a large popup/modal.
- Closed state is a floating orb.
- Open state is a bottom command dock.
- Answers appear as compact floating cards above the dock.
- Prompt chips are compact and contextual.
- Page remains visible and usable behind the assistant.
- Source chips and suggested actions still work.
- Operational actions still require confirmation.
- UI feels closer to Siri/Google Assistant while still matching BatchNexus enterprise design.