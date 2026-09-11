# VEIL Player Desktop 0.8.0-RC2

VEIL Player Desktop is the non-normative desktop reference implementation for the normative [VEIL Spec 0.1](https://github.com/allamzedan/veil). Application behavior does not redefine the standard.

## Validation and interoperability

- All 113 authoritative VEIL conformance vectors pass.
- Correct local Skip behavior with nonzero `globalOffsetSeconds`.
- Deterministic metadata-v1 identity generation.
- Forward-compatible preservation of unknown item types.
- Duplicate-ID rejection during writer admission.
- Style-less Mask support.
- Duplicate JSON-member rejection.
- Finite input and resource limits.

## Desktop release changes

- Hardened Electron and packaging dependencies.
- Privacy-safe public source history and Apache-2.0 licensing for Desktop source.
- YouTube provider privacy, retention, Made-for-Kids, client-identity, player-size, and acknowledgement hardening.
- Source retains the optional YouTube provider implementation and documents its pending policy questions.
- The initial official 0.8.0-RC2 Windows installer and portable executable are provider-disabled pending provider-policy confirmation.

Provider-disabled packaging is the production default. Local developer provider builds require `VEIL_ENABLE_YOUTUBE_PROVIDER=true` at build time and remain subject to applicable provider terms.

The VEIL specification is separately licensed, with any applicable OWFa patent assurance separate from the Desktop source license. Third-party components retain their own licenses.
