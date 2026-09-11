# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## [3.1.0] - 2026-09-10
### Changed
- The templates folder now holds **only** the templates you customize. Anything you have not
  overridden comes from the templates the extension ships, so improvements to those reach
  existing installs on update instead of being shadowed forever by a copy. Versions 3.0.0 and
  3.0.1 filled the folder with a copy of every default on first run; copies you never edited are
  removed and every template you customized is kept.
- Opening a built-in template with `Edit or Add a Template` and closing it without changing
  anything no longer turns that language into an override: the copy is dropped again, and you
  keep getting improvements to the built-in template. Changing the file is what makes it yours.
- The one-time import of templates customized under 2.0.4 or earlier now brings over only the
  files you actually changed, for the same reason, and also looks in the pre-2.0.4 layout
  (`out/src/templates`) used by 2.0.0 - 2.0.3.
- Every `${date}` in a template is replaced, not just the first one.
- An empty template file in your folder is treated as absent, so it no longer silently shadows
  the built-in one.
### Added
- New command `File Template: Edit or Add a Template`: pick a language (the current file's
  language first), and get your own editable copy of the built-in template, or a blank file for a
  language nothing ships a template for. Delete the file to go back to the built-in template.
- The templates folder gets a `README.md` explaining the override rule.

## [3.0.1] - 2026-08-23
### Changed
- Renamed the commands from `Tmpl: Create <language> Template` to `File Template: Insert <language> Template`: they insert a template at the cursor rather than creating anything, and the category now matches the extension's name. The command ids are unchanged, so existing keybindings keep working.
- The message shown when no template exists for the current language now names the language it looked for.

## [3.0.0] - 2026-08-22
### Fixed
- The templates you edit or add now live in a per-user folder outside the extension's install directory, so they survive extension updates instead of being wiped out along with the previous version's folder. On the first activation after an upgrade, templates found in a previous version's folder are copied into the new location automatically on a best-effort basis (VS Code may already have removed that folder by the time the update runs, so this can't be guaranteed for every upgrade path). This one-time import exists only to carry forward templates customized under version 2.0.4 or earlier, and it stops running after 2027-10-01 (see `LEGACY_MIGRATION_CUTOFF` in `src/templateStorage.ts`); the related code should be deleted once that date has safely passed.
### Added
- New command `Tmpl: Open Templates Folder`, which opens the folder where the templates you edit or add are stored.

## [2.0.3] - 2017-12-03
### Update
- Move the template folder into `asset`.

## [2.0.0] - 2017-12-01
### Update
- Switch to reading templates from files.
- Users can now edit templates and add new ones.

## [1.1.3] - 2017-11-22
### Update
- Fix the error message shown when no file is open.

## [1.1.1] - 2017-10-25
### Update
- Add a command for every language.

## [1.0.1] - 2017-10-24
### Update
- Update to run with VS Code 1.17.

## [1.0.0] - 2017-03-21
### Added
- Add the `.vue` type.

## [0.0.4] - 2017-03-08
### Added
- GIF

## [0.0.3] - 2017-03-08
### Added
- GitHub link

## [0.0.2] - 2017-03-08
### Added
- Logo

## [0.0.1] - 2017-03-08
### Added
- First publish
