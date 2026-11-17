Unicode true
!include "MUI2.nsh"
!define APP "CEsim Studio"
!ifndef VER
!define VER "1.19.0"
!endif
!define EXE "CEsim Studio.exe"
!define SRC "..\..\out\CEsim Studio-win32-x64"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\CEsimStudio"
Name "${APP} ${VER}"
OutFile "..\..\dist\CEsim-Studio-${VER}-Windows-x64-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\CEsim Studio"
InstallDirRegKey HKCU "Software\CEsim Studio" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
VIProductVersion "1.19.0.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} Setup"
VIAddVersionKey "FileVersion" "${VER}"
VIAddVersionKey "ProductVersion" "${VER}"
VIAddVersionKey "CompanyName" "YOUSEF A.ALGHAMDI"
VIAddVersionKey "LegalCopyright" "BY. YOUSEF A.ALGHAMDI"
!define MUI_ICON "..\..\assets\icon.ico"
!define MUI_UNICON "..\..\assets\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "CEsim Studio ${VER}"
!define MUI_WELCOMEPAGE_TEXT "Circuits, digital logic, Verilog, computer architecture, 8086, Arduino, diagrams and 3D in one place.$\r$\n$\r$\nBY. YOUSEF A.ALGHAMDI"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Open CEsim Studio"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

!macro Assoc EXT DESC
  WriteRegStr HKCU "Software\Classes\.${EXT}" "" "CEsimStudio.${EXT}"
  WriteRegStr HKCU "Software\Classes\CEsimStudio.${EXT}" "" "${DESC}"
  WriteRegStr HKCU "Software\Classes\CEsimStudio.${EXT}\DefaultIcon" "" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "Software\Classes\CEsimStudio.${EXT}\shell\open\command" "" '"$INSTDIR\${EXE}" "%1"'
!macroend
!macro OpenWith EXT DESC
  WriteRegStr HKCU "Software\Classes\CEsimStudio.${EXT}" "" "${DESC}"
  WriteRegStr HKCU "Software\Classes\CEsimStudio.${EXT}\DefaultIcon" "" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "Software\Classes\CEsimStudio.${EXT}\shell\open\command" "" '"$INSTDIR\${EXE}" "%1"'
  WriteRegStr HKCU "Software\Classes\.${EXT}\OpenWithProgids" "CEsimStudio.${EXT}" ""
!macroend
!macro UnAssoc EXT
  DeleteRegKey HKCU "Software\Classes\CEsimStudio.${EXT}"
  ReadRegStr $0 HKCU "Software\Classes\.${EXT}" ""
  StrCmp $0 "CEsimStudio.${EXT}" 0 +2
  DeleteRegKey HKCU "Software\Classes\.${EXT}"
!macroend

Section "Install"
  nsExec::Exec 'taskkill /IM "${EXE}" /F'
  SetOutPath "$INSTDIR"
  File /r "${SRC}\*.*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\CEsim Studio"
  CreateShortcut "$SMPROGRAMS\CEsim Studio\CEsim Studio.lnk" "$INSTDIR\${EXE}"
  CreateShortcut "$SMPROGRAMS\CEsim Studio\Uninstall CEsim Studio.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\CEsim Studio.lnk" "$INSTDIR\${EXE}"
  !insertmacro Assoc "cesim" "CEsim Circuit"
  !insertmacro Assoc "cediag" "CEsim Diagram"
  !insertmacro Assoc "ce3d" "CEsim 3D model"
  !insertmacro Assoc "cedig" "CEsim Logic circuit"
  !insertmacro Assoc "cebb" "CEsim Breadboard"
  !insertmacro Assoc "cepcb" "CEsim PCB"
  !insertmacro Assoc "cevlsi" "CEsim VLSI layout"
  WriteRegStr HKCU "Software\Classes\.circ\OpenWithProgids" "CEsimStudio.cedig" ""
  !insertmacro OpenWith "asm" "Assembly source"
  !insertmacro OpenWith "ino" "Arduino sketch"
  !insertmacro OpenWith "v" "Verilog source"
  !insertmacro OpenWith "vcd" "Waveform (VCD)"
  !insertmacro OpenWith "s" "Assembly source"
  WriteRegStr HKCU "Software\Classes\Applications\${EXE}\shell\open\command" "" '"$INSTDIR\${EXE}" "%1"'
  WriteRegStr HKCU "Software\Classes\.cir\OpenWithProgids" "CEsimStudio.cesim" ""
  WriteRegStr HKCU "Software\Classes\.drawio\OpenWithProgids" "CEsimStudio.cediag" ""
  WriteRegStr HKCU "Software\Classes\.stl\OpenWithProgids" "CEsimStudio.ce3d" ""
  WriteRegStr HKCU "Software\CEsim Studio" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "CEsim Studio"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VER}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "YOUSEF A.ALGHAMDI"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM "${EXE}" /F'
  Delete "$DESKTOP\CEsim Studio.lnk"
  RMDir /r "$SMPROGRAMS\CEsim Studio"
  !insertmacro UnAssoc "cesim"
  !insertmacro UnAssoc "cediag"
  !insertmacro UnAssoc "ce3d"
  !insertmacro UnAssoc "cedig"
  !insertmacro UnAssoc "cebb"
  !insertmacro UnAssoc "cepcb"
  !insertmacro UnAssoc "cevlsi"
  DeleteRegValue HKCU "Software\Classes\.circ\OpenWithProgids" "CEsimStudio.cedig"
  DeleteRegKey HKCU "Software\Classes\CEsimStudio.asm"
  DeleteRegValue HKCU "Software\Classes\.asm\OpenWithProgids" "CEsimStudio.asm"
  DeleteRegKey HKCU "Software\Classes\CEsimStudio.ino"
  DeleteRegValue HKCU "Software\Classes\.ino\OpenWithProgids" "CEsimStudio.ino"
  DeleteRegKey HKCU "Software\Classes\CEsimStudio.v"
  DeleteRegValue HKCU "Software\Classes\.v\OpenWithProgids" "CEsimStudio.v"
  DeleteRegKey HKCU "Software\Classes\CEsimStudio.vcd"
  DeleteRegValue HKCU "Software\Classes\.vcd\OpenWithProgids" "CEsimStudio.vcd"
  DeleteRegKey HKCU "Software\Classes\CEsimStudio.s"
  DeleteRegValue HKCU "Software\Classes\.s\OpenWithProgids" "CEsimStudio.s"
  DeleteRegValue HKCU "Software\Classes\.cir\OpenWithProgids" "CEsimStudio.cesim"
  DeleteRegValue HKCU "Software\Classes\.drawio\OpenWithProgids" "CEsimStudio.cediag"
  DeleteRegValue HKCU "Software\Classes\.stl\OpenWithProgids" "CEsimStudio.ce3d"
  DeleteRegKey HKCU "Software\Classes\Applications\${EXE}"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegKey HKCU "Software\CEsim Studio"
  RMDir /r "$INSTDIR"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
SectionEnd
