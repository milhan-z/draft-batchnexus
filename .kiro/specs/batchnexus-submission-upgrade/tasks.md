# Implementation Plan: BatchNexus Submission Upgrade

## Overview

This plan implements the comprehensive update package for BatchNexus Control Tower ahead of CyberHack 2026 submission. Tasks are ordered by judging criteria priority: Enterprise Readiness (30%), Problem-Solution Fit (20%), UX (20%), Innovation (20%), then cross-cutting and stretch features. Each task builds incrementally on previous work, with shared utilities and components created first to support downstream features.

## Tasks

- [x] 1. Enterprise Readiness — RBAC, Audit, Policy, Human-in-the-Loop
  - [x] 1.1 Fix RBAC route-capability alignment in `lib/rbac.ts`
    - Remove `/audit` from QC Staff's route list in `ROLE_ACCESS`
    - Ensure `canAccessRoute(role, "/audit")` returns false when `canViewAudit(role)` returns false
    - Add redirect or "Access Denied" message for unauthorized route access attempts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.2 Create `lib/audit.ts` — shared audit logger utility
    - Implement `AuditEntry` interface with fields: timestamp, actor, role, action, entity, change_detail
    - Implement `logAudit(role, action, entity, changeDetail)` function that creates audit_log entries via API client
    - Use `getActorName(role)` from RBAC service for the actor field
    - _Requirements: 14.2, 14.6_

  - [x] 1.3 Create `lib/slotValidation.ts` — policy validation engine
    - Implement `SlotValidationResult` and `PolicyViolation` interfaces
    - Implement `validateSlotAssignment(lot, zone, bin)` that checks hazard_policy compatibility and temperature range (temp_min–temp_max)
    - Return violations array with type ("hazard" | "temperature" | "quarantine") and descriptive messages
    - _Requirements: 9.2, 9.3, 9.7_

  - [x] 1.4 Write property test for RBAC route-capability alignment
    - **Property 5: RBAC Route-Capability Alignment**
    - Enumerate all roles × routes × capabilities, verify route access implies capability access
    - **Validates: Requirements 7.1, 7.4**

  - [x] 1.5 Write property test for slot policy validation
    - **Property 7: Slot Policy Validation**
    - Generate random lot hazard/temp × zone policy combinations, verify correct rejection of violations
    - **Validates: Requirements 9.2, 9.3, 9.7**

  - [x] 1.6 Create `components/shared/HumanInTheLoopBadge.tsx`
    - Badge component showing "Human decision required" on AI outputs
    - Consistent styling across QC, slotting, and summary surfaces
    - Include accessibility label for screen readers
    - _Requirements: 14.4_

  - [x] 1.7 Write property test for audit trail completeness
    - **Property 14: Audit Trail Completeness**
    - Generate random critical actions, verify audit entry contains non-empty actor, role, action, entity, change_detail
    - **Validates: Requirements 14.2, 14.6**

- [x] 2. Checkpoint — Enterprise Readiness foundation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Problem-Solution Fit — Data-Driven Dashboard, Notifications, QC Schema
  - [x] 3.1 Fix QC inspection schema consistency in `app/qc/page.tsx`
    - Ensure QC_Module writes inspections with canonical field names: `colour_score`, `defect_risk`, `foreign_matter_risk`, `recommendation`, `confidence`, `human_decision`
    - Store `colour_score` as numeric 0–100 and `confidence` as fractional 0–1
    - Store `source_receipt_id` on lot creation from QC release
    - Maintain backward-compatible `receipt_id` field
    - _Requirements: 3.1, 3.2, 3.5, 4.1, 4.4_

  - [x] 3.2 Fix Lots module QC data display in `app/lots/page.tsx`
    - Display QC inspection fields without showing "undefined" or "NaN"
    - Use placeholder "—" for absent values
    - Render Overview tab using `source_receipt_id` to fetch supplier, receipt, and quantity
    - Render QC Data tab using `source_receipt_id` to fetch linked inspection
    - _Requirements: 3.3, 3.4, 4.2, 4.3_

  - [x] 3.3 Write property test for QC inspection schema consistency
    - **Property 1: QC Inspection Schema Consistency**
    - Generate random QC inspection payloads with valid/invalid/missing fields, verify no "undefined" or "NaN" in display
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 3.4 Write property test for lot-receipt linkage integrity
    - **Property 2: Lot-Receipt Linkage Integrity**
    - Generate receipts, trigger lot creation, verify source_receipt_id linkage returns correct data
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 3.5 Create `lib/notifications.ts` — data-driven notification engine
    - Implement `Notification` interface with id, type, title, message, source_entity, timestamp, read fields
    - Implement `deriveNotifications(zones, auditLogs, receipts)` that derives notifications from Cold_Chain_Alerts, recent audit_logs, and receipts with status "Pending QC"
    - No hardcoded notification content
    - _Requirements: 6.1, 6.4, 6.5_

  - [x] 3.6 Update `components/Layout/TopBar.tsx` with data-driven notifications
    - Replace hardcoded notifications with `deriveNotifications()` output
    - Display unread count badge driven by actual unread items
    - Implement "Mark all read" functionality persisted to localStorage
    - Show "No notifications" empty state when no events exist
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.7 Write property test for notification data integrity
    - **Property 4: Notification Data Integrity**
    - Generate random operational events, verify notification derivation matches source records and unread count is correct
    - **Validates: Requirements 6.1, 6.2, 6.5**

  - [x] 3.8 Update Dashboard (`app/page.tsx`) with data-driven AI Insight and cold-chain banner
    - Derive AI Insight card content from `lots` and `sample_dispatches` records (no hardcoded identifiers)
    - Derive cold-chain banner from zones with status "Cold-chain Alert" showing actual temperature values
    - Show informative empty state when no lots meet priority criteria or no cold-chain alerts exist
    - Add HumanInTheLoopBadge on AI Insight card
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.9 Write property test for dashboard data-driven content
    - **Property 3: Dashboard Data-Driven Content**
    - Generate random lots/dispatches/zones, verify dashboard derives content exclusively from records
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [x] 4. Checkpoint — Problem-Solution Fit complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. UX — Vertical QC Flow, Design Pass, View Toggle, Action Menu
  - [x] 5.1 Create `components/shared/ViewToggle.tsx`
    - Reusable list/grid toggle component with active indicator styling
    - Accept `view` and `onViewChange` props
    - Include accessibility attributes (aria-pressed, labels)
    - _Requirements: 1.4_

  - [x] 5.2 Create `components/shared/ActionMenu.tsx`
    - Reusable row action menu using Mantine Menu component
    - Stop event propagation on trigger click to prevent row navigation
    - Accept configurable menu items array
    - Close menu on outside click without data changes
    - _Requirements: 2.4, 2.5_

  - [x] 5.3 Create `components/shared/EmptyState.tsx`
    - Consistent empty state component with icon, title, and description props
    - Used across all modules for empty data scenarios
    - _Requirements: 13.2_

  - [x] 5.4 Update `app/inbound/page.tsx` with ViewToggle and ActionMenu
    - Add ViewToggle for list/grid switching with list as default
    - Implement grid card view showing batch_reference, material name, supplier, quantity with unit, priority, and status
    - Ensure both views display identical data in same order
    - Add ActionMenu on each row/card with "View in QC" and "View Detail" options
    - "View in QC" navigates to QC module with receipt selected
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.2, 2.3_

  - [x] 5.5 Write property test for view toggle data identity
    - **Property 17: View Toggle Data Identity**
    - Generate random receipt arrays, verify both views show same records in same order with required fields
    - **Validates: Requirements 1.5, 1.6**

  - [x] 5.6 Redesign QC Analysis panel to vertical flow in `app/qc/page.tsx`
    - Restructure QC Analysis area to vertical flow layout (top-to-bottom)
    - Display AI recommendation card, metrics (colour, defect, foreign matter), and Visual QC analyzer sequentially
    - Ensure single-column scrollable layout on mobile viewport
    - Utilize full screen width on desktop without nested scroll
    - Preserve all QC decision functions (Approve, Recheck, Block)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 5.7 Apply consistent design pass across all pages
    - Implement consistent visual hierarchy (page title, description, primary action placement) across modules
    - Add EmptyState component to all modules with empty data scenarios
    - Add consistent loading states across modules
    - Ensure responsive layout on mobile viewports
    - Use shared components for status badges, cards, buttons, and modals
    - Add basic accessibility attributes (labels on interactive controls, logical focus order)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 6. Checkpoint — UX improvements complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Innovation — AI Summary, Manual Override, Manual Entry
  - [x] 7.1 Create `components/shared/SlotPanel.tsx` — slot assignment panel
    - Display AI Slot_Recommendation with accept option
    - Provide manual bin/zone selector dropdown
    - Integrate `validateSlotAssignment()` for policy validation on manual selection
    - Show explicit policy violation messages and prevent save when violations exist
    - Require non-empty reason field when override differs from recommendation
    - Call `logAudit()` on successful save with assignment_type ("accepted-AI" or "manual-override")
    - Update lot status to "Stored" and set `current_location` to selected bin
    - Create `inventory_moves` record with reason and assignment_type
    - Add HumanInTheLoopBadge on AI recommendation display
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 7.2 Write property test for override requires reason
    - **Property 8: Override Requires Reason**
    - Generate override scenarios where selection differs from recommendation, verify reason enforcement
    - **Validates: Requirements 9.4**

  - [x] 7.3 Write property test for slot assignment audit trail
    - **Property 9: Slot Assignment Audit Trail**
    - Generate assignments (accepted-AI and manual-override), verify audit entry and lot status update
    - **Validates: Requirements 9.5, 9.6**

  - [x] 7.4 Integrate SlotPanel into `app/warehouse/page.tsx`
    - Add SlotPanel component to warehouse page for lot slotting workflow
    - Restrict manual zone choices for hazard materials based on zone hazard_policy
    - Wire RBAC to disable controls for non-Warehouse Admin roles with tooltip explanation
    - _Requirements: 9.1, 9.7, 14.5_

  - [x] 7.5 Create `components/shared/ManualEntryForm.tsx` — manual receipt entry form
    - Form with fields: supplier, material, quantity, unit, batch_reference, arrival_date, temperature_requirement, hazard_class
    - Validate material and supplier against `materials` and `suppliers` collections
    - Use Mantine form with zod schema validation
    - Prevent submission when required fields are empty or invalid
    - Mark invalid fields with clear error messages
    - No AI dependency
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.7_

  - [x] 7.6 Write property test for manual entry validation
    - **Property 10: Manual Entry Validation**
    - Generate form payloads with random valid/invalid fields, verify validation rules
    - **Validates: Requirements 10.3, 10.4, 10.5**

  - [x] 7.7 Update `app/inbound/new/page.tsx` with Manual Entry path
    - Add toggle between AI extraction path and Manual_Entry path
    - Integrate ManualEntryForm component for manual path
    - On valid submission: create receipt with status "Pending QC"
    - Call `logAudit()` with action indicating "Manual Entry" source
    - _Requirements: 10.1, 10.6_

  - [x] 7.8 Write property test for manual receipt creation correctness
    - **Property 11: Manual Receipt Creation Correctness**
    - Generate valid manual entries, verify receipt status is "Pending QC" and audit log is created
    - **Validates: Requirements 10.6**

  - [x] 7.9 Create `lib/summaryEngine.ts` — deterministic summary generator
    - Implement `OperationsSummary`, `ModuleSummary`, `KPI`, `AttentionItem`, `Recommendation` interfaces
    - Implement `generateDeterministicSummary(db)` that produces sections for intake, QC, warehouse, cold-chain, dispatch
    - Derive KPI values from actual record counts/statuses
    - Generate attention items referencing real record identifiers
    - Generate recommendations from operational conditions
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.7_

  - [x] 7.10 Update `app/summary/page.tsx` with enriched summary
    - Display per-module sections, KPIs, attention items with links, and recommendations
    - Add export/print functionality for the generated summary
    - Call `logAudit()` on successful summary generation
    - Enforce RBAC: block generation for roles where `canGenerateSummary` returns false
    - Use `generateDeterministicSummary()` as AI fallback when external service unavailable
    - Add HumanInTheLoopBadge on AI-generated content
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [x] 7.11 Write property test for summary content completeness
    - **Property 12: Summary Content Completeness**
    - Generate random operational data, verify summary contains all required sections with KPIs derived from actual records
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**

  - [x] 7.12 Write property test for summary RBAC enforcement
    - **Property 13: Summary RBAC Enforcement**
    - Test all roles × canGenerateSummary, verify blocked/allowed correctly
    - **Validates: Requirements 12.8**

- [x] 8. Checkpoint — Innovation features complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Cross-Cutting — AI Fallback, Data Compatibility
  - [x] 9.1 Ensure AI route fallback determinism for all retained routes
    - Verify `/api/ai/qc-score`, `/api/ai/summary`, `/api/ai/copilot`, `/api/ai/extract-manifest` each have deterministic fallback
    - Each route must detect missing API key or service unavailability and return valid structured response
    - Ensure each route is called by at least one module
    - Remove or connect any orphaned AI routes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 15.3_

  - [x] 9.2 Write property test for AI route fallback determinism
    - **Property 6: AI Route Fallback Determinism**
    - Call each retained AI route with mocked unavailable service, verify valid structured fallback response
    - **Validates: Requirements 8.2, 8.4, 15.3**

  - [x] 9.3 Ensure data layer offline resilience in `lib/api/client.ts`
    - Verify `fetchItems` falls back to `fallbackFetch()` on DaaS proxy error or empty data
    - Verify `createItem`/`updateItem` fall back to `fallbackCreate`/`fallbackUpdate` when DaaS unavailable
    - Add console warning on fallback activation
    - _Requirements: 15.1, 15.2, 15.4_

  - [x] 9.4 Write property test for data layer offline resilience
    - **Property 15: Data Layer Offline Resilience**
    - Mock DaaS failure, verify fallback read/write behavior
    - **Validates: Requirements 15.1, 15.2, 15.4**

  - [x] 9.5 Update `lib/demoData.ts` with schema changes and SEED_VERSION bump
    - Bump `SEED_VERSION` to reflect all schema changes (lots with source_receipt_id, qc_inspections canonical fields, inventory_moves with assignment_type)
    - Update `INITIAL_DB` records to match new schemas
    - Maintain backward-compatible fields (receipt_id on lots)
    - Ensure all collections have consistent sample records
    - _Requirements: 16.1, 16.3, 16.4_

  - [x] 9.6 Implement auto-reseed on version mismatch in `lib/demoStore.ts`
    - Verify `getDemoDB()` detects stored version < current SEED_VERSION
    - Trigger reseed from INITIAL_DB and update stored version on mismatch
    - Handle SSR case (localStorage unavailable) by returning INITIAL_DB directly
    - _Requirements: 16.2_

  - [x] 9.7 Write property test for auto-reseed on version mismatch
    - **Property 16: Auto-Reseed on Version Mismatch**
    - Set old version in storage, verify reseed behavior and version update
    - **Validates: Requirements 16.2**

- [x] 10. Checkpoint — Cross-cutting concerns complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Stretch — Acknowledge Alert, Recall Simulation, Genealogy Graph
  - [x] 11.1 Implement acknowledge cold-chain alert in `app/warehouse/page.tsx`
    - Add acknowledge action button on zones with status "Cold-chain Alert"
    - On acknowledge: update zone status to indicate alert handled
    - Call `logAudit()` with actor persona, role, entity (zone ID), and change_detail
    - Disable acknowledge for roles without warehouse/slotting capability with tooltip
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 11.2 Write property test for acknowledge cold-chain side effects
    - **Property 19: Acknowledge Cold-Chain Side Effects**
    - Generate zones with alerts, verify status update and audit log creation on acknowledge
    - **Validates: Requirements 18.2, 18.3**

  - [x] 11.3 Implement recall/impact simulation in `app/lots/page.tsx`
    - Add "Simulate Recall" action on lot detail view
    - Derive impact list from `sample_dispatches` records where `lot_id` matches selected lot
    - Display affected customers and dispatch details
    - Show "No impact" empty state when no dispatches linked
    - Add export functionality for recall results
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 11.4 Write property test for recall impact derivation
    - **Property 18: Recall Impact Derivation**
    - Generate lots with random dispatch links, verify correct impact list derivation
    - **Validates: Requirements 17.1, 17.2**

  - [x] 11.5 Implement lot genealogy mini-graph in `app/lots/page.tsx`
    - Display graph linking upstream nodes (receipt, QC inspection) to downstream nodes (inventory_move, dispatch) for selected lot
    - Derive nodes from records linked via `source_receipt_id` and `lot_id`
    - Show node detail on selection
    - Mark missing stages as "not available" without errors
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 11.6 Write property test for genealogy graph from real records
    - **Property 20: Genealogy Graph from Real Records**
    - Generate lots with various link depths, verify correct upstream/downstream node derivation
    - **Validates: Requirements 19.1, 19.2, 19.4**

- [x] 12. Final Checkpoint — All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each priority group
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Implementation uses TypeScript throughout (Next.js 16 App Router + React 19 + Mantine)
- All AI features must work with deterministic fallback (no API key required)
- Audit logging is integrated into every critical action task, not as a separate concern
- RBAC enforcement is wired into each feature that requires access control

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.6"] },
    { "id": 1, "tasks": ["1.4", "1.5", "1.7", "3.1", "3.5", "5.1", "5.2", "5.3"] },
    { "id": 2, "tasks": ["3.2", "3.6", "3.8", "5.4", "5.6"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.7", "3.9", "5.5", "5.7"] },
    { "id": 4, "tasks": ["7.1", "7.5", "7.9", "9.5"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4", "7.6", "7.7", "9.1", "9.3", "9.6"] },
    { "id": 6, "tasks": ["7.8", "7.10", "9.2", "9.4", "9.7"] },
    { "id": 7, "tasks": ["7.11", "7.12", "11.1", "11.3", "11.5"] },
    { "id": 8, "tasks": ["11.2", "11.4", "11.6"] }
  ]
}
```
