# Change Log


## [Unreleased]

### Changed
- **Version preparation**: Preparing for next release

## [2.5.2]

### Added
- **Enhanced compile_commands.json generation control**: Added `xmake.autoGenerateCompileCommands` setting with three modes:
  - `onFileChange` (default): Generate compile_commands.json when xmake.lua files change
  - `onBuild`: Generate compile_commands.json after building the project
  - `disabled`: Disable automatic generation (manual generation still available via command)
- **Flexible manual generation**: Manual generation via "XMake: UpdateIntellisense" command is now available regardless of automatic generation setting
- **Improved configuration organization**: Moved compile_commands generation setting alongside other compile_commands related settings

### Changed
- **Updated default behavior**: Changed default automatic generation behavior to be more configurable
- **Enhanced documentation**: Updated README with detailed explanations of generation modes and troubleshooting

### Fixed
- **Manual trigger logic**: Fixed manual generation to work even when automatic generation is disabled

## [2.5.1]

### Added
- **Enhanced compile_commands.json generation**: Added new auto-generation features and improved control

### Changed
- **Improved user experience**: Better handling of compile_commands.json generation

## [2.5.0]

### Changed
- **Updated dependencies**: Bumped package dependencies for better compatibility

## [2.4.9]

### Fixed
- **Target list display**: Fixed issues with target listing in the explorer

## [2.4.8]

### Changed
- **Debugger improvements**: Enhanced debugger functionality and stability

## [2.4.7]

### Added
- **Logo icon**: Added XMake logo icon to the status bar
- **Improved status layout**: Better organization and display of status bar elements
- **XMake Explorer**: Enhanced explorer visibility and functionality

### Changed
- **Status bar improvements**: 
  - Improved build button appearance
  - Adjusted status order for better UX
  - Enhanced tips and layout

## [2.4.6]

### Added
- **lldb-dap support**: Added support for lldb-dap debugger (#317)

### Fixed
- **Path handling**: Fixed path issues in debugger configurations

## [2.4.0]

### Added
- **Major features**: New functionality and improvements

## Older Versions
For changes in older versions, please refer to the git commit history.