# VEIL Architecture
Version: 1.0 Draft

Status: Living Document

---

# Purpose

This document defines the architectural rules of VEIL.

Its goal is long-term maintainability.

The architecture must remain understandable years after the project began.

---

# Architecture Philosophy

VEIL follows five principles.

1.

Single Responsibility

Each module has one reason to change.

---

2.

Local First

No architecture may require cloud services.

Everything should work offline.

---

3.

Non-destructive

Runtime never modifies source media.

Editing produces VEIL instructions only.

---

4.

Separation of Concerns

Playback

UI

Persistence

State

Business Logic

must remain independent.

---

5.

Composable

Features should be assembled from reusable modules.

Never duplicate behavior.

---

# High-Level Layers

Application

↓

UI Components

↓

Feature Modules

↓

Store

↓

Core Libraries

↓

Electron Bridge

↓

Operating System

---

# Folder Responsibilities

src/components/

Pure UI.

Rules

No business logic.

No filesystem.

No parsing.

No serialization.

Only rendering and interaction.

---

src/hooks/

Connect UI to application state.

Hooks may coordinate behavior.

Hooks should remain reusable.

---

src/state/

Single source of truth.

Contains:

Playback

Bookmarks

Subtitles

VEIL

Selection

Settings

History

Never duplicate state elsewhere.

---

src/lib/

Business logic.

Contains:

Timeline

Bookmarks

Subtitles

Track serialization

Matching VEIL

Playback helpers

Validation

No React.

No DOM.

No Electron.

Pure logic whenever possible.

---

electron/

Everything requiring native APIs.

Filesystem

Dialogs

Window management

IPC

Protocols

File association

Never leak Electron into React.

---

docs/

Product documentation.

Architecture

Manifest

Roadmaps

Design

Release notes

---

tests/

Unit tests

Integration tests

Future E2E

---

# State Ownership

Playback owns:

currentTime

duration

paused

rate

volume

fullscreen

---

Track owns:

Masks

Mutes

Skips

Bookmarks

Metadata

Track path

Dirty state

Undo

Redo

---

Subtitle owns:

Cue list

Offset

Visibility

Presentation

Current cue

Loaded file

Never mix subtitle state with track state.

---

Settings owns:

Theme

Language

Accessibility

Preferences

Recent files

---

# Feature Ownership

Mask

Owns masking only.

Never manages playback.

---

Mute

Owns audio suppression only.

---

Skip

Owns playback jumps only.

---

Bookmark

Owns navigation only.

Never modifies playback.

---

Subtitle

Owns text presentation only.

---

Media

Owns loading media.

Never edits VEIL.

---

VEIL

Owns persistence.

Never controls playback.

---

# Communication Rules

Component

↓

Hook

↓

Store

↓

Library

↓

Electron

Never the opposite.

Components should never call Electron directly.

---

# IPC Rules

Renderer

↓

Preload

↓

IPC

↓

Main

↓

OS

Never bypass preload.

---

# Timeline Rules

Timeline displays state.

Timeline never owns state.

Timeline never decides playback.

---

# Inspector Rules

Inspector edits selected item.

Inspector never edits unrelated features.

Apply commits.

Cancel discards.

Delete confirms.

---

# Runtime Rules

Only these affect playback:

Mask

Mute

Skip

Bookmarks never affect playback.

---

# Testing Rules

Every new feature requires:

Logic tests

Serialization tests

Regression tests

Manual QA checklist

---

# Performance Rules

UI should remain responsive.

Playback always wins.

Never block renderer.

Expensive work belongs in libraries or workers.

---

# Backward Compatibility

Older VEIL versions should load whenever practical.

Schema migrations should normalize data.

Never silently destroy information.

---

# Git Rules

Every milestone requires:

Commit

Tag

QA

Documentation update

Portable build

---

# Future Architecture

The following modules are planned.

Media

Bookmarks+

Playlists

Audio

Subtitle Search

Learning

Accessibility

They should integrate without restructuring the existing architecture.

---

# Decision Rule

Before adding code ask:

Does this belong in this layer?

If not,

move it before writing it.