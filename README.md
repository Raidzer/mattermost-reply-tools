# Mattermost Reply Tools

This repository contains **Channel Reply**, a webapp-only Mattermost plugin that lets users reply to a specific message in the channel timeline or in a thread without manually copying the original text.

The plugin package is named `Channel Reply`, uses the ID `com.github.mattermost-channel-reply`, and is currently version `1.1.3`.

> **Community project:** this plugin is not developed or supported by Mattermost. It was created with the help of AI-assisted coding tools and is provided as-is. Review the source and test the plugin in your own environment before using it in production.

## What it adds

- **Reply in channel** — starts a reply in the main channel composer. The result is a separate channel post with a quoted reference instead of a thread reply.
- **Reply in thread** — starts a reply in the thread sidebar. The result remains part of that thread.
- **Clickable quotes** — opens and highlights the original message through its Mattermost permalink.
- **Composer preview** — shows the selected author and up to five lines of quoted text before the reply is sent.
- **Mobile-readable fallback** — stores the quote as Markdown so native mobile clients can display it even though the plugin UI is unavailable there.

## Screenshots

Reply action in the message toolbar:

![Reply action in Mattermost](images/reply-button.png)

Quoted reply inside a thread:

![Quoted reply in a Mattermost thread](images/quoted-reply-thread.png)

## Compatibility

- Mattermost Server **9.0 or later**; tested with Mattermost **10.5.x**
- Mattermost web and desktop clients for creating and interacting with quoted replies
- Mattermost native mobile clients can read the Markdown fallback, but cannot create quoted replies
- [Threaded discussions](https://docs.mattermost.com/administration-guide/configure/site-configuration-settings.html#threaded-discussions) (formerly Collapsed Reply Threads) enabled for the intended thread experience

The plugin has no server component and no configurable settings.

## Build from source

Prerequisites:

- Node.js **18 or later** and npm
- GNU Make and the standard Unix tools `cp`, `rm`, `mkdir`, and `tar`
- On Windows, use WSL or Git Bash to run the Makefile

Build and package the plugin from the repository root:

```bash
make dist
```

The command installs the exact dependencies from `webapp/package-lock.json`, checks the TypeScript source, builds `webapp/dist/main.js`, and creates:

```text
dist/com.github.mattermost-channel-reply-1.1.3.tar.gz
```

Useful targets:

```bash
make webapp  # install, type-check, and build the webapp bundle
make clean   # remove generated bundles and installed dependencies
```

To run the webapp checks directly:

```bash
cd webapp
npm ci
npm run typecheck
npm run build
```

## Install

### System Console

1. Make sure plugins and plugin uploads are enabled for the deployment.
2. Open **System Console → Plugins → Management**.
3. Upload `dist/com.github.mattermost-channel-reply-1.1.3.tar.gz`.
4. Enable **Channel Reply**.
5. Reload the Mattermost web or desktop client.

### mmctl

```bash
mmctl plugin upload dist/com.github.mattermost-channel-reply-1.1.3.tar.gz
mmctl plugin enable com.github.mattermost-channel-reply
```

For the intended thread behavior, open **System Console → Site Configuration → Posts**, set **Threaded discussions** to **Always On**, and enable **Automatically follow threads**.

## Project layout

```text
├── images/                 # README screenshots
├── webapp/
│   ├── src/                # React and TypeScript source
│   ├── package.json        # webapp scripts and dependencies
│   └── package-lock.json   # reproducible dependency lock
├── Makefile                # build and packaging targets
├── plugin.json             # Mattermost plugin manifest
└── LICENSE
```

## Forking and releasing

If you publish a fork, replace the plugin ID with a reverse-DNS ID you control in:

- `plugin.json`
- `webapp/src/manifest.ts`
- `webapp/src/types/store.ts` (`PLUGIN_STATE_KEY`)
- `Makefile`

Keep the version synchronized in `plugin.json`, `webapp/src/manifest.ts`, `webapp/package.json`, and `Makefile`. After changing `webapp/package.json`, update `webapp/package-lock.json` with npm.

## License

Released under the [MIT License](LICENSE). Copyright © 2026 Виталий Кутузов.
