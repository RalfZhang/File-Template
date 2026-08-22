# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)

## [3.0.0] - 2026-08-22
### Fixed
- Custom/added templates now live in a per-user folder outside the extension's install directory, so they survive extension updates instead of being wiped out along with the previous version's folder. On first activation after upgrading, templates found in a previous version's folder are copied into the new location automatically on a best-effort basis (VS Code may already have removed that folder by the time the update runs, so this can't be guaranteed for every upgrade path).
### Added
- New command `Tmpl: Open Templates Folder` to open the folder where custom/added templates should be edited.

## [2.0.3] - 2017-12-03
### Update
- Move template folder to asset.

## [2.0.0] - 2017-12-01
### Update
- Up to template file reading mode.
- User can edit or add template.

## [1.1.3] - 2017-11-22
### Update
- Fix error info when not opening a file

## [1.1.1] - 2017-10-25
### Update
- Add every languages' cmd

## [1.0.1] - 2017-10-24
### Update
- Update to run with vscode 1.17

## [1.0.0] - 2017-03-21
### Added
- Add .vue type.

## [0.0.4] - 2017-03-08
### Added
- GIF

## [0.0.3] - 2017-03-08
### Added
- GitHub Link

## [0.0.2] - 2017-03-08
### Added
- Logo

## [0.0.1] - 2017-03-08
### Added
- First publish
