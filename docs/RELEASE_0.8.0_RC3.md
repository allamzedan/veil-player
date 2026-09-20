# VEIL Player Desktop 0.8.0-RC3

VEIL Player Desktop is the non-normative desktop reference implementation for the normative [VEIL Spec 0.1](https://github.com/allamzedan/veil). Application behavior does not redefine the standard, and VEIL remains provider-independent.

## Provider-enabled distribution

- The 0.8.0-RC3 Windows installer and portable executable enable the optional YouTube provider for development, testing, interoperability demonstrations, and project showcase use.
- Provider enablement remains behind the existing build-time gate; provider-disabled builds are still the source default.
- RC3 packaging requires `VEIL_ENABLE_YOUTUBE_PROVIDER=true` at build time.
- No YouTube API key is included or embedded.
- This release does not claim YouTube or Google approval or endorsement.

Provider-enabled builds remain subject to applicable YouTube policies and separate provider-compliance requirements.

## Packaging

From PowerShell, package the provider-enabled RC3 artifacts with:

```powershell
$env:VEIL_ENABLE_YOUTUBE_PROVIDER = 'true'; npm run dist
```

The VEIL specification is separately licensed, with any applicable OWFa patent assurance separate from the Desktop source license. Third-party components retain their own licenses.
