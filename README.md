# Mattermost Reply Tools

**Channel Reply** gives Mattermost users two explicit ways to reply to a selected message: continue the conversation directly in the channel with a visible quote, or send a regular reply inside a thread.

This is a small community plugin with no server process or settings page. All interface logic runs in the Mattermost webapp client.

## What it looks like

### Selecting a message

The **Reply** button appears in the message action bar and prepares the appropriate editor for a quoted reply. The same action can be started by double-clicking a non-interactive area of the message body: in the channel timeline, the reply is posted to the main channel; in the right-hand thread panel, it is posted to the open thread.

To distinguish a single click from a double click, the plugin delays single-click handling by 500 ms. If no second click arrives, the event is passed to Mattermost and the regular thread opens from the channel timeline. On a double click, the pending single click is canceled, so the right-hand panel does not open before **Reply** mode starts.

Double clicks are not intercepted on interactive elements such as links, buttons, input fields, code blocks, images, attachments, and embedded content. These elements continue to work without delay.

![Reply button in the message action bar](images/reply-button.png)

### Posted reply

A compact card for the original message appears above the reply text. Clicking it opens the original message through its permanent link.

![Reply with an interactive quote](images/quoted-reply-thread.png)

## Reply and navigation flows

| Action | Result | What participants see |
| --- | --- | --- |
| Channel timeline → **Reply** or double-click the message body | A separate reply in the main channel | The selected message quote and the new text |
| Right-hand thread panel → **Reply** or double-click the message body | A reply in the current thread | The quote and reply inside the discussion |
| Channel timeline → single-click the message body | The thread opens in the right-hand panel after a 500 ms delay | Quoted reply mode is not activated |
| Message menu → **Thread** | A reply in the selected message's thread | A regular thread reply with a quote |

After a message is selected, the plugin focuses the appropriate editor and displays a preview. The selection can be cleared with the close button. When the reply is posted, the plugin stores:

- the original message ID in the new post's properties;
- a separate reply body for the plugin's web interface;
- a Markdown quote in the message field as a portable fallback.

The fallback keeps the reply readable in clients that cannot render this plugin's components.

## Client support

| Client | Creating quoted replies | Displaying replies |
| --- | --- | --- |
| Mattermost Web | Fully supported | Interactive quote card |
| Mattermost Desktop | Fully supported | Interactive quote card |
| Native Android and iOS apps | Not supported | Plain Markdown quote |

Native mobile apps do not load webapp plugins. Messages created in a browser or the desktop client remain readable on mobile, but the **Reply** button and editor preview are not available there.

## Compatibility and limitations

- the minimum Mattermost Server version declared in the manifest is **9.0.0**;
- the current plugin version is **1.2.0**;
- **Threaded discussions → Always On** is recommended for predictable thread behavior;
- double-click reply is available only in Mattermost Web and Desktop;
- single-clicking a message body is handled with a 500 ms delay to prevent the thread from opening before a double click;
- links, buttons, code blocks, images, attachments, and other interactive elements are not double-click reply targets;
- deleted and system messages cannot be selected as reply targets;
- long source messages are shortened in the quote card and Markdown representation;
- the plugin has no backend process and adds no API endpoints;
- the plugin has no configuration options.

The project was tested with Mattermost 11.6.2. Before deploying it to production, verify the build against the server and client versions used by your team.

## Installation

Installation requires a built plugin archive:

```text
dist/com.github.mattermost-channel-reply-1.2.0.tar.gz
```

### System Console

1. Allow custom plugins and plugin uploads in the server configuration.
2. Open **System Console → Plugins → Plugin Management**.
3. Upload the archive from the `dist` directory.
4. Enable **Channel Reply**.
5. Reload the Mattermost browser tab or desktop client.

### mmctl

```bash
mmctl plugin add dist/com.github.mattermost-channel-reply-1.2.0.tar.gz
mmctl plugin enable com.github.mattermost-channel-reply
```

## Building from source

The standard build requires Node.js 18 or newer, npm, GNU Make, and the `cp`, `mkdir`, `rm`, and `tar` commands.

```bash
make dist
```

This command installs the dependency versions from the lockfile, runs the TypeScript check, creates the production bundle, and packages the plugin.

Individual operations:

```bash
make webapp  # install dependencies, type-check, and build the webpack bundle
make bundle  # package an existing webapp/dist build
make clean   # remove generated files and node_modules
```

On Windows, run the Makefile through WSL or Git Bash. To build and package the plugin without `make`, use PowerShell:

```powershell
npm --prefix webapp ci
npm --prefix webapp run typecheck
npm --prefix webapp run build

$pluginId = 'com.github.mattermost-channel-reply'
$pluginVersion = '1.2.0'
$distPath = Join-Path $PWD 'dist'
$stagePath = Join-Path $distPath $pluginId
$archivePath = Join-Path $distPath "$pluginId-$pluginVersion.tar.gz"

Remove-Item -LiteralPath $stagePath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $archivePath -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path (Join-Path $stagePath 'webapp/dist') -Force | Out-Null
Copy-Item -LiteralPath 'plugin.json' -Destination $stagePath
Copy-Item -LiteralPath 'webapp/dist/main.js' -Destination (Join-Path $stagePath 'webapp/dist')
Copy-Item -LiteralPath 'webapp/dist/main.js.LICENSE.txt' -Destination (Join-Path $stagePath 'webapp/dist')
tar -czf $archivePath -C $distPath $pluginId
```

The completed archive is written to `dist/com.github.mattermost-channel-reply-1.2.0.tar.gz`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `plugin.json` | Plugin ID, version, compatibility, and webapp bundle path |
| `webapp/src/index.tsx` | Component registration and message-posting hook |
| `webapp/src/components/` | Reply button, quote card, and editor preview |
| `webapp/src/components/DoubleClickReplyHandler.tsx` | Single/double-click separation and double-click reply handling |
| `webapp/src/actions/` | Context selection, thread opening, and navigation to the original message |
| `webapp/src/utils/mobileQuote.ts` | Markdown fallback generation for mobile clients |
| `webapp/src/styles/` | Plugin component styles |
| `Makefile` | Validation, build, and installable archive creation |

## Preparing your own release

Before publishing your own build, use a reverse-DNS identifier that you control. The current value appears in several places and must be changed consistently:

- `plugin.json`;
- `webapp/src/manifest.ts`;
- `PLUGIN_STATE_KEY` in `webapp/src/types/store.ts`;
- `PLUGIN_ID` in `Makefile`.

Keep the version synchronized in `plugin.json`, `webapp/src/manifest.ts`, `webapp/package.json`, and `Makefile`. After changing npm dependencies or metadata, update `webapp/package-lock.json`.

This project is not an official Mattermost product and is not supported by Mattermost.

## License

MIT — see [LICENSE](LICENSE) for the full text.
