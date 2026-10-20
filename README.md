# reply-quote

A Claude Code mod that works like the desktop app's "Reply": select text in the terminal, click **Reply ↰**, and your next prompt is sent as a reply to that quoted part.

- Select text with the mouse, in a response or in your own prompt. A box above the prompt offers **Reply ↰**.
- Quotes stack: select and reply to several parts, then write once to reply to all of them.
- Each quote shows in the band above the prompt, with **▼ Show more** for long ones and **✕ Remove** to drop it.
- Long quotes are sent to Claude as their start and end only (Claude already has the text in context), which saves tokens. Each quote shows a rough token estimate.

Mouse selection is only visible to mods in fullscreen mode.

## Install

At the prompt of a Claude Code session:

```
/plugin install reply-quote --marketplace DiegoHermosilloP/reply-quote
```

Answer `y` to add the marketplace, then choose a scope. From a shell:

```
claude plugin install reply-quote --marketplace DiegoHermosilloP/reply-quote
```

## Settings

Under `/config`: preview length, maximum quotes, maximum characters sent per quote (0 sends every quote whole), and the colours of quotes, selection and quoted text.
