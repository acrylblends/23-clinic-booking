export interface PageInput { readonly title: string; readonly main: string; readonly active?: string }
export type Notice = { readonly kind: 'ok' | 'error' | 'warn'; readonly text: string }
export interface Shell { readonly prefix: string; e(text: string): string; href(path: string): string; page(input: PageInput): string; notice(url: string): string; url(path: string, notice?: Notice): string }
export const escapeHtml = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
export interface ShellLook { readonly appTitle: string; readonly css: string; readonly bodyClass: string; readonly nav: (active: string | undefined, href: (path: string) => string) => string }
export function createShell(prefix: string, look: ShellLook): Shell {
  const href = (path: string): string => `${prefix}${path.startsWith('/') ? path : `/${path}`}`
  return { prefix, e: escapeHtml, href,
    url(path, notice) { if (notice === undefined) return href(path); const [base, query] = path.split('?') as [string, string | undefined]; return `${href(base)}${query === undefined ? '?' : `?${query}&`}${notice.kind}=${encodeURIComponent(notice.text)}` },
    notice(url) { const query = new URL(url, 'http://local').searchParams; for (const kind of ['error', 'warn', 'ok'] as const) { const text = query.get(kind); if (text !== null && text !== '') return `<p class="notice ${kind}" role="${kind === 'ok' ? 'status' : 'alert'}">${escapeHtml(text)}</p>` } return '' },
    page({ title, main, active }) { return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · ${escapeHtml(look.appTitle)}</title><style>${look.css}</style></head><body class="${look.bodyClass}"><div class="app">${look.nav(active, href)}${main}</div></body></html>` },
  }
}
