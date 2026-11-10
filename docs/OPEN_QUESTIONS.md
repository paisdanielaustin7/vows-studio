# VOWS Studio — Open Questions & Technical Log

> **Purpose:** Per Master Prompt §2, record any ambiguous points, trade-offs, or external items requiring stakeholder decision.

---

## 1. Architecture & Security

*(No open architectural questions. All settled by DECISION_LOG.md)*

---

## 2. Business Workflows & Roles

*(No open workflow questions. All state machines defined in BUSINESS_WORKFLOWS.md)*

---

## 3. Data & Finance

*(No open financial questions. Paise + basis points calculation engine specified in D-16/D-17)*

---

## 4. UI & Design System

*(Design tokens and Stitch screens verified and aligned to Serene Editorial)*

---

## 5. Third-Party Integrations & Limits

- **TOTP MFA in Supabase Free/Pro:** Supabase TOTP MFA is supported; custom lockout handled via application layer (`auth_attempts`).
- **Personal Gmail Soft Budget:** 400 emails/day soft budget set to respect Google's ~500 recipient cap.
