!include nsDialogs.nsh

!macro RegisterVeilMediaType Extension
  WriteRegStr HKCU "Software\Classes\Applications\VEIL Player.exe\SupportedTypes" ".${Extension}" ""
  WriteRegStr HKCU "Software\Classes\.${Extension}\OpenWithList\VEIL Player.exe" "" ""
!macroend

!macro UnregisterVeilMediaType Extension
  DeleteRegKey HKCU "Software\Classes\.${Extension}\OpenWithList\VEIL Player.exe"
  DeleteRegKey /ifempty HKCU "Software\Classes\.${Extension}\OpenWithList"
!macroend

!ifndef BUILD_UNINSTALLER
Var DesktopShortcutPage
Var DesktopShortcutCheckbox
Var CreateDesktopShortcut

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customPageAfterChangeDir
  Page custom DesktopShortcutPageCreate DesktopShortcutPageLeave
!macroend

Function DesktopShortcutPageCreate
  nsDialogs::Create 1018
  Pop $DesktopShortcutPage
  ${NSD_CreateLabel} 0u 0u 300u 18u "Shortcut options"
  Pop $0
  ${NSD_CreateCheckbox} 0u 24u 300u 18u "Create a desktop shortcut"
  Pop $DesktopShortcutCheckbox
  ${NSD_SetState} $DesktopShortcutCheckbox ${BST_CHECKED}
  nsDialogs::Show
FunctionEnd

Function DesktopShortcutPageLeave
  ${NSD_GetState} $DesktopShortcutCheckbox $CreateDesktopShortcut
FunctionEnd

!macro customInit
  StrCpy $CreateDesktopShortcut ${BST_CHECKED}
!macroend

!macro customInstall
  ${If} $CreateDesktopShortcut != ${BST_CHECKED}
    Delete "$newDesktopLink"
    WinShell::UninstShortcut "$newDesktopLink"
  ${EndIf}

  WriteRegStr HKCU "Software\Classes\Applications\VEIL Player.exe" "FriendlyAppName" "VEIL Player"
  WriteRegStr HKCU "Software\Classes\Applications\VEIL Player.exe\shell\open\command" "" '"$INSTDIR\VEIL Player.exe" "%1"'

  !insertmacro RegisterVeilMediaType "mp4"
  !insertmacro RegisterVeilMediaType "webm"
  !insertmacro RegisterVeilMediaType "mkv"
  !insertmacro RegisterVeilMediaType "mov"
  !insertmacro RegisterVeilMediaType "avi"
  !insertmacro RegisterVeilMediaType "m4v"
  !insertmacro RegisterVeilMediaType "ogv"
  !insertmacro RegisterVeilMediaType "mp3"
  !insertmacro RegisterVeilMediaType "wav"
  !insertmacro RegisterVeilMediaType "m4a"
  !insertmacro RegisterVeilMediaType "aac"
  !insertmacro RegisterVeilMediaType "flac"
  !insertmacro RegisterVeilMediaType "ogg"
!macroend
!endif

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Applications\VEIL Player.exe"

  !insertmacro UnregisterVeilMediaType "mp4"
  !insertmacro UnregisterVeilMediaType "webm"
  !insertmacro UnregisterVeilMediaType "mkv"
  !insertmacro UnregisterVeilMediaType "mov"
  !insertmacro UnregisterVeilMediaType "avi"
  !insertmacro UnregisterVeilMediaType "m4v"
  !insertmacro UnregisterVeilMediaType "ogv"
  !insertmacro UnregisterVeilMediaType "mp3"
  !insertmacro UnregisterVeilMediaType "wav"
  !insertmacro UnregisterVeilMediaType "m4a"
  !insertmacro UnregisterVeilMediaType "aac"
  !insertmacro UnregisterVeilMediaType "flac"
  !insertmacro UnregisterVeilMediaType "ogg"
!macroend
