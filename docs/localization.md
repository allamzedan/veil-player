# Localization

VEIL Player Desktop uses English (`en`) as its source and fallback locale. The supported UI locales are Arabic (`ar`), Spanish (`es`), French (`fr`), German (`de`), Turkish (`tr`), Simplified Chinese (`zh`), and Japanese (`ja`). Arabic uses right-to-left document direction; timeline coordinates, paths, URLs, identifiers, and time values remain left-to-right where required.

Translations live in `src/i18n`. When adding or changing English text, update every supported locale in the same change. Preserve interpolation tokens such as `{count}`, `{name}`, and `{path}` exactly, while moving them as needed for natural word order. Keep `VEIL`, `VEIL Player`, `VEIL Spec`, schema keys, file extensions, URLs, and provider names unchanged.

Run `npm test -- src/i18n/i18n.test.ts` to check key parity, non-empty values, interpolation tokens, locale metadata, invalid-locale fallback, and Arabic RTL metadata. Use the language selector in Settings to review the main window, dialogs, menus, errors, and long labels in every locale.
