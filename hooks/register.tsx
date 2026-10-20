import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const quotes = atom({ plugin: 'reply-quote', key: 'quotes' } as const, [])
const selected = atom({ plugin: 'reply-quote', key: 'selected' } as const, null)
// Indices of the quotes drawn in full rather than cut to the preview length.
const open = atom({ plugin: 'reply-quote', key: 'open' } as const, [])

const FULL = 3000
const POLL_MS = 400

const cut = (text: string, max: number, isFlat: boolean) => {
  const shown = isFlat ? text.replace(/\s+/g, ' ').trim() : text.trim()

  return shown.length > max ? `${shown.slice(0, max)}…` : shown
}

const asBlock = (text: string) =>
  text
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n')

// What is sent for a quote: whole, or, past `limit` characters, its start and
// end. The text is already in Claude's context, so the ends locate it.
const sent = (text: string, limit: number) => {
  const whole = text.trim()

  if (limit === 0 || whole.length <= limit) {
    return whole
  }

  const head = whole.slice(0, Math.ceil(limit * 0.65)).trimEnd()
  const tail = whole.slice(-Math.floor(limit * 0.35)).trimStart()

  return `${head}\n[… middle omitted, it is earlier in this conversation …]\n${tail}`
}

// A rough token count, four characters to a token.
const tokens = (text: string) => Math.ceil(text.length / 4)

export const register: Register = (on, options) => {
  const preview = Number(options.previewChars)
  const maxQuotes = Number(options.maxQuotes)
  const quoteColor = String(options.quoteColor)
  const selectionColor = String(options.selectionColor)
  const textColor = String(options.quoteTextColor)
  const sentChars = Number(options.sentChars)

  // The selection last quoted, so a highlight that outlives the press does
  // not offer itself again.
  let taken: string | null = null

  on('session.start', async ($, e, next) => {
    $.clock.every(POLL_MS, async () => {
      const text = (await $.ui.selection())?.text.trim() || null

      if (text === null) {
        taken = null
      }

      const offered = text !== null && text !== taken ? text : null

      if (offered !== (await read($, selected))) {
        await update($, selected, () => offered)
      }
    })

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const list = await read($, quotes)

    if (e.command || e.isMeta || list.length === 0) {
      return next(e)
    }

    await update($, quotes, () => [])
    await update($, open, () => [])
    const heading = list.length === 1 ? 'Replying to:' : 'Replying to these:'
    const body = list.map(quote => asBlock(sent(quote, sentChars))).join('\n\n')

    return next({ ...e, text: `${heading}\n\n${body}\n\n${e.text}` })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, quotes)
    const offered = await read($, selected)
    const opened = await read($, open)

    if (e.props.hasSurvey || (list.length === 0 && offered === null)) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)

    const toggle = (i: number) =>
      update($, open, l => (l.includes(i) ? l.filter(n => n !== i) : [...l, i]))

    return (
      <Box flexDirection="column">
        {list.map((quote, i) => {
          const isOpen = opened.includes(i)
          const isLong = quote.length > preview

          return (
            <Box key={`q${i}`} flexDirection="column" borderStyle="round" borderColor={quoteColor} paddingX={1}>
              <Text color={quoteColor} weight="bold">
                {`↰ Replying to (${i + 1}/${list.length}) · ~${tokens(sent(quote, sentChars))} tokens sent`}
              </Text>
              <Text color={textColor}>{isOpen ? cut(quote, FULL, false) : cut(quote, preview, true)}</Text>
              <Box>
                {isLong && (
                  <Button
                    key={`t${i}`}
                    label={isOpen ? '▲ Show less ' : '▼ Show more '}
                    onPress={() => toggle(i)}
                  />
                )}
                <Button
                  key={`x${i}`}
                  label="✕ Remove"
                  onPress={async () => {
                    await update($, quotes, l => l.filter((_, n) => n !== i))
                    await update($, open, () => [])
                  }}
                />
              </Box>
            </Box>
          )
        })}
        {list.length > 0 && (
          <Button
            key="clear"
            label="✕ Remove quotes"
            onPress={async () => {
              await update($, quotes, () => [])
              await update($, open, () => [])
            }}
          />
        )}
        {offered !== null && (
          <Box flexDirection="column" borderStyle="round" borderColor={selectionColor} paddingX={1}>
            <Text color={selectionColor}>{`“${cut(offered, 160, true)}”`}</Text>
            <Button
              key="reply"
              variant="primary"
              label="Reply ↰"
              onPress={async () => {
                taken = offered
                await update($, quotes, l => [...l, offered].slice(-maxQuotes))
                await update($, selected, () => null)
              }}
            />
          </Box>
        )}
      </Box>
    )
  })
}
