// Nimbus Labs Academic Technical Report — Visual Tokens & Reusable Helpers
#let nimbus-cobalt = rgb("#1E3A5F")
#let slate-ink     = rgb("#1E293B")
#let warm-paper    = rgb("#F8FAFC")
#let amber-warn    = rgb("#D97706")
#let amber-text    = rgb("#92400E")
#let amber-bg      = rgb("#FEF3C7")
#let crimson-err   = rgb("#DC2626")
#let crimson-bg    = rgb("#FEE2E2")
#let emerald-ok    = rgb("#047857")
#let emerald-bg    = rgb("#ECFDF5")
#let cobalt-bg     = rgb("#EFF6FF")
#let muted-slate   = rgb("#475569")
#let rule-line     = rgb("#E2E8F0")
#let term-obsidian = rgb("#0F172A")

#let apply-theme(doc-title: "Building and Auditing an AI-Agent Toolchain", author: "Neel Prabir Singh", roll: "150096725058", body) = {
  set document(
    title: doc-title,
    author: author,
  )
  set page(
    paper: "a4",
    margin: (top: 22mm, bottom: 22mm, left: 20mm, right: 20mm),
    fill: white,
    header: context {
      if counter(page).get().first() > 1 [
        #set text(font: ("Inter", "Helvetica Neue"), size: 7.5pt, fill: muted-slate)
        #grid(
          columns: (1fr, auto),
          [AI Tools and Prompt Engineering — #doc-title],
          [#author · Roll #roll],
        )
        #v(-3pt)
        #line(length: 100%, stroke: 0.4pt + rule-line)
      ]
    },
    footer: context {
      set text(font: ("Inter", "Helvetica Neue"), size: 7.5pt, fill: muted-slate)
      line(length: 100%, stroke: 0.4pt + rule-line)
      v(-2pt)
      grid(
        columns: (1fr, auto),
        [Nimbus Labs · Campus Helpdesk Agent (`campus-helpdesk` v1.0.0) · Accessed 2026-11-17],
        [Page #counter(page).display("1 of 1", both: true)],
      )
    },
  )

  set text(
    font: ("Libertinus Serif", "New Computer Modern"),
    size: 9.8pt,
    fill: slate-ink,
    number-type: "lining",
    number-width: "tabular",
  )
  set par(leading: 0.65em, spacing: 0.75em, justify: false)

  show heading.where(level: 1): it => {
    set text(font: ("Inter", "Helvetica Neue"), size: 14pt, weight: "bold", fill: nimbus-cobalt)
    block(above: 14pt, below: 8pt, breakable: false)[
      #it.body
      #v(-4pt)
      #line(length: 100%, stroke: 1.2pt + nimbus-cobalt)
    ]
  }
  show heading.where(level: 2): it => {
    set text(font: ("Inter", "Helvetica Neue"), size: 11.2pt, weight: "bold", fill: nimbus-cobalt)
    block(above: 11pt, below: 5pt, breakable: false)[#it.body]
  }
  show heading.where(level: 3): it => {
    set text(font: ("Inter", "Helvetica Neue"), size: 9.8pt, weight: "bold", fill: slate-ink)
    block(above: 8pt, below: 4pt, breakable: false)[#it.body]
  }

  show raw.where(block: false): it => box(
    fill: rgb("#F1F5F9"),
    inset: (x: 3pt, y: 1.5pt),
    radius: 2pt,
    text(font: ("DejaVu Sans Mono", "Menlo"), size: 8.2pt, fill: nimbus-cobalt)[#it]
  )

  show raw.where(block: true): it => block(
    width: 100%,
    fill: warm-paper,
    stroke: 0.6pt + rule-line,
    radius: 3pt,
    inset: 8pt,
    breakable: true,
    text(font: ("DejaVu Sans Mono", "Menlo"), size: 7.7pt, fill: slate-ink)[#it]
  )

  body
}

#let callout(title, body, accent: nimbus-cobalt, bg: cobalt-bg, title-color: nimbus-cobalt) = block(
  width: 100%,
  fill: bg,
  stroke: (left: 3pt + accent),
  inset: (x: 10pt, y: 8pt),
  radius: (right: 3pt),
  breakable: false,
)[
  #text(font: ("Inter", "Helvetica Neue"), size: 8.8pt, weight: "bold", fill: title-color)[#title]
  #v(2pt)
  #body
]

#let badge(label, fg: nimbus-cobalt, bg: cobalt-bg) = box(
  fill: bg,
  stroke: 0.5pt + fg,
  radius: 2pt,
  inset: (x: 4pt, y: 1.5pt),
  text(font: ("Inter", "Helvetica Neue"), size: 7.3pt, weight: "bold", fill: fg)[#label]
)

#let terminal-block(title, content) = block(
  width: 100%,
  fill: term-obsidian,
  stroke: 0.8pt + rgb("#334155"),
  radius: 4pt,
  inset: 9pt,
  breakable: true,
)[
  #block(sticky: true, above: 0pt, below: 4pt)[
    #text(font: ("Inter", "Helvetica Neue"), size: 7.5pt, weight: "bold", fill: rgb("#93C5FD"))[#title]
  ]
  #text(font: ("DejaVu Sans Mono", "Menlo"), size: 7.3pt, fill: rgb("#E2E8F0"))[#raw(block: false, content)]
]
