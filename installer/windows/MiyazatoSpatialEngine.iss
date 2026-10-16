#ifndef AppVersion
  #error Build with scripts/build-installer-windows.ps1 to supply the CMake project version.
#endif
#ifndef VcMinimumVersion
  #error The verified VC++ prerequisite version is required.
#endif
#define RepoRoot "..\.."
#define AppName "Miyazato Spatial Engine"
#define AppExe "MiyazatoSpatialEngine.exe"
#define AppIcon "assets\branding\icons\miyazato-spatial-engine.ico"

[Setup]
AppId={{E84A6164-244C-4B17-B2A4-07F09939AF89}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=Miyazato
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
DisableWelcomePage=no
DisableDirPage=no
PrivilegesRequired=admin
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os
MinVersion=10.0.22000
OutputDir={#RepoRoot}\dist\windows\installer
OutputBaseFilename=MiyazatoSpatialEngine-Setup-{#AppVersion}
SetupIconFile={#RepoRoot}\{#AppIcon}
UninstallDisplayIcon={app}\{#AppIcon}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
#if FileExists(RepoRoot + "\LICENSE")
LicenseFile={#RepoRoot}\LICENSE
#endif

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked

[Files]
Source: "{#RepoRoot}\dist\windows\app\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "prerequisites\MicrosoftEdgeWebview2Setup.exe"; Flags: dontcopy
Source: "prerequisites\vc_redist.x64.exe"; Flags: dontcopy

[Icons]
Name: "{commonprograms}\{#AppName}"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppIcon}"
Name: "{commondesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppIcon}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent runasoriginaluser; Check: CanLaunch

[Code]
const
  WebViewKey = 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  VcKey = 'SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64';
var
  PrerequisiteReboot: Boolean;

function HasVersion(Root: Integer; Key, ValueName: String): Boolean;
var
  Value: String;
  Version: Int64;
begin
  Result := RegQueryStringValue(Root, Key, ValueName, Value);
  if Result then
    Result := StrToVersion(Value, Version) and (Version > 0);
end;

function HasWebView: Boolean;
begin
  { Require machine runtime: elevated HKCU can belong to another administrator. }
  Result := HasVersion(HKLM32, WebViewKey, 'pv') or
            HasVersion(HKLM64, WebViewKey, 'pv');
end;

function HasVcAt(Root: Integer): Boolean;
var
  Installed: Cardinal;
  Value: String;
  Version, RequiredVersion: Int64;
begin
  Result := False;
  if not RegQueryDWordValue(Root, VcKey, 'Installed', Installed) then exit;
  if Installed <> 1 then exit;
  if not RegQueryStringValue(Root, VcKey, 'Version', Value) then exit;
  if (Length(Value) > 0) and (Value[1] = 'v') then Delete(Value, 1, 1);
  if not StrToVersion(Value, Version) then exit;
  if not StrToVersion('{#VcMinimumVersion}', RequiredVersion) then exit;
  Result := Version >= RequiredVersion;
end;

function HasVc: Boolean;
begin
  Result := HasVcAt(HKLM64) or HasVcAt(HKLM32);
end;

function InstallPrerequisite(FileName, Arguments: String): String;
var
  ExitCode: Integer;
begin
  Result := '';
  ExtractTemporaryFile(FileName);
  if not Exec(ExpandConstant('{tmp}\') + FileName, Arguments, '',
              SW_HIDE, ewWaitUntilTerminated, ExitCode) then
    Result := 'Could not start ' + FileName + '. Windows error: ' + IntToStr(ExitCode)
  else if ExitCode = 3010 then
    PrerequisiteReboot := True
  else if ExitCode <> 0 then
    Result := FileName + ' failed with exit code ' + IntToStr(ExitCode) +
      '. Check internet access and Microsoft prerequisite installation logs, then retry.';
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if not HasVc then begin
    Result := InstallPrerequisite('vc_redist.x64.exe', '/install /quiet /norestart');
    if Result <> '' then exit;
    if not HasVc then begin
      Result := 'VC++ x64 runtime detection failed after installation.';
      exit;
    end;
  end;
  if not HasWebView then begin
    Result := InstallPrerequisite('MicrosoftEdgeWebview2Setup.exe', '/silent /install');
    if Result <> '' then exit;
    if not HasWebView then
      Result := 'WebView2 Runtime detection failed after installation. Check internet access and retry.';
  end;
  { Inno offers a restart at completion; no prerequisite may restart automatically. }
end;

function NeedRestart: Boolean;
begin
  Result := PrerequisiteReboot;
end;

function CanLaunch: Boolean;
begin
  Result := not PrerequisiteReboot;
end;
