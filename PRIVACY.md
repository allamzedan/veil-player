# VEIL Player Privacy Policy

Last updated: September 11, 2026

VEIL Player is a desktop media player. This policy describes the behavior of the public VEIL Player application in this repository. It does not claim provider approval.

## Local media and VEIL files

Local audio and video processing occurs on your device. VEIL Player does not upload local media or `.veil` timeline files. A `.veil` file contains local, user-authored timeline instructions and metadata; it does not contain the media. The application may keep local recent-file paths and preferences on your device. You can remove individual recent entries or clear recent history in the app.

## YouTube provider

YouTube support is optional and uses YouTube API Services. The YouTube IFrame Player loads audiovisual content from YouTube. When a Data API key is supplied through `VEIL_YOUTUBE_DATA_API_KEY`, VEIL Player may request a video's title, channel title, description, publication time, and Made-for-Kids status through `videos.list`. Those values are used only for the current session and a short in-memory cache (normally six hours); Made-for-Kids metadata is not cached.

Persistent YouTube recent history contains only the video identifier, canonical URL entered by the user, a generic “YouTube video” label, and the local open time. YouTube-derived titles, descriptions, channel names, publication times, durations, and Made-for-Kids status are not written to recent history. Clearing recent history deletes the stored provider identifiers and URLs. User-authored VEIL timeline instructions remain local data and are not classified as YouTube API Data.

The player uses YouTube's enhanced-privacy embed domain. YouTube or Google may still receive network information and may store or access cookies or similar technology when you interact with the player, according to their own policies. VEIL Player does not sign users in to YouTube and does not request authorized YouTube account data.

VEIL Player has no analytics or playback telemetry. It does not add advertising, child profiling, or provider tracking. Its public update check requests only public version metadata.

## API keys and control

The application contains no shared YouTube Data API key. A key is optional, read only from the process environment, and is not written to application storage. Without a key, local playback and YouTube IFrame playback remain available, but Data API descriptions and Made-for-Kids metadata lookup are unavailable.

You control local data through the recent-history clear/remove controls and by deleting application data through the operating system. These actions do not delete information held by YouTube or Google.

By using the YouTube provider you agree to the [YouTube Terms of Service](https://www.youtube.com/t/terms). See also the [Google Privacy Policy](https://policies.google.com/privacy) and the [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service). Questions may be filed through the repository's public [issue tracker](https://github.com/allamzedan/veil-player/issues).
