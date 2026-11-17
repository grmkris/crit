/** What the index shows for a page, read from its `index.html`: the title, the description and the date. */

const unescape = (text: string): string =>
  text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')

const metaOf = (html: string, name: string): string => {
  for (const tag of html.match(/<meta\b[^>]*>/giu) ?? []) {
    if (new RegExp(`\\bname\\s*=\\s*["']${name}["']`, 'iu').test(tag)) {
      return unescape(
        /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/iu
          .exec(tag)
          ?.slice(1)
          .find((value) => value !== undefined) ?? '',
      )
    }
  }
  return ''
}

export interface PageMeta {
  readonly title: string
  readonly description: string
  readonly date: string
}

export const metaFrom = (html: string, slug: string): PageMeta => {
  const title = unescape(/<title[^>]*>([^<]*)<\/title>/iu.exec(html)?.[1]?.trim() ?? '')
  const date = metaOf(html, 'date').trim()
  return {
    title: (title === '' ? slug : title).slice(0, 200),
    description: metaOf(html, 'description').trim().slice(0, 500),
    date: /^\d{4}-\d{2}-\d{2}$/u.test(date) ? date : '',
  }
}
