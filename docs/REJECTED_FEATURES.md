# VEIL Rejected Features
Version: 1.0
Status: Living Document

---

# Purpose

This document records features that were consciously rejected.

A rejected feature is not necessarily a bad idea.

It simply does not align with VEIL's current philosophy.

Recording these decisions prevents repeated discussions and keeps the product focused.

---

# Rejected Features

## Cloud Accounts

Status

Rejected

Reason

VEIL is Local-First.

Accounts introduce complexity, privacy concerns, infrastructure costs, and dependencies that conflict with the product philosophy.

---

## Mandatory Internet

Status

Rejected

Reason

VEIL must work completely offline.

Internet connectivity must never be required for playback or editing.

---

## Telemetry

Status

Rejected

Reason

Privacy-first.

No analytics that collect user behavior without explicit opt-in.

---

## Advertising

Status

Rejected

Reason

Conflicts with the professional desktop experience.

---

## Video Transcoding

Status

Rejected

Reason

VEIL never modifies original media.

---

## Video Conversion

Status

Rejected

Reason

Outside project scope.

Dedicated tools already exist.

---

## Media Editing

Status

Rejected

Reason

VEIL edits viewing instructions only.

---

## Social Features

Status

Rejected

Reason

Outside scope.

---

## Streaming Platform

Status

Rejected

Reason

VEIL is a local media application.

---

## DRM

Status

Rejected

Reason

Not compatible with the project's philosophy.

---

## Automatic Content Download

Status

Rejected

Reason

Users provide their own media.

---

## OCR-based Subtitle Recognition

Status

Deferred

Reason

Possible future research.

Not part of VEIL 1.0.

---

## AI Content Moderation

Status

Deferred

Reason

Future enhancement.

Requires separate design.

---

## Cloud Synchronization

Status

Deferred

Reason

Must never become mandatory.

Would require a separate architecture.

---

# Decision Rule

A rejected feature may only be reconsidered if:

- It aligns with VEIL_MANIFEST.md.
- It does not violate Local-First.
- It does not violate Non-Destructive principles.
- It significantly improves the user experience.