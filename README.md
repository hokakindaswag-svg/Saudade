# SAUDADE — Shopify theme

An Online Store 2.0 theme built for SAUDADE: editorial fashion ecommerce
structure, colourful brand identity, mobile-first shopping.

Everything on the storefront is driven by real Shopify objects — products,
collections, variants, cart, search, filters, recommendations. No hardcoded
product data anywhere.

---

## Install

```bash
npm i -g @shopify/cli
shopify theme push --unpublished --store sacredsaudade.myshopify.com
```

Then in the admin: **Online Store → Themes → Customize** to set images and copy.
Preview it before publishing; nothing here touches the live theme until you hit
Publish.

Local development:

```bash
shopify theme dev --store sacredsaudade.myshopify.com
shopify theme check          # passes clean
```

---

## What you need to set up in Shopify

These are the only things the theme expects from the store. All of them are
optional in the sense that the theme degrades gracefully without them — but the
design assumes them.

| What | Where | Why |
|---|---|---|
| Menu handle `main-menu` | Navigation | Header + mobile drawer. Nested items become a mega menu. |
| Menu handle `footer` | Navigation | Footer link columns. |
| Logo + light logo | Theme settings → Logo | Light version is used when the header sits over a dark hero. |
| Product option named `Color` | Products | Drives swatches on cards and circular swatches on the PDP. Rename in Theme settings → Product cards if yours is `Colour`. |
| Product option named `Size` | Products | Drives hover quick-add on cards and the size pills on the PDP. |
| Metafields `custom.fit`, `custom.materials` | Settings → Custom data | Fill the "Fit & sizing" and "Material & care" accordions on the PDP. |
| Filters | Search & Discovery app | Enables the collection filter panel. Without them, only sort shows. |
| Complementary products | Search & Discovery app | Powers "Complete the look" on the PDP and cart drawer recommendations. |
| Tag `new` on products | Products | Shows the NEW badge. Tag name is configurable. |
| A page for the size guide | Pages | Selected in the PDP "Variant picker" block; opens in a modal. |

---

## Structure

```
layout/    theme.liquid, password.liquid
sections/  header-group.json, footer-group.json + 22 sections
snippets/  product-card, cart-items, facets, price, icon, meta-tags, …
templates/ index/collection/product/cart/search/page/blog/404 (JSON)
           customers/*.liquid, gift_card.liquid
assets/    base.css, theme.js
config/    settings_schema.json, settings_data.json
locales/   en.default.json
```

### Homepage order (`templates/index.json`)

Announcement bar → Header → Hero → New in → Category tiles → Campaign
editorial → Bestsellers → Scrolling text → Brand story → Newsletter → Icon row
→ Footer.

Every one of those is a section you can reorder, duplicate, hide or delete in
the Theme Editor.

### Sections available

`hero`, `featured-products`, `editorial-image`, `collection-list`,
`brand-world`, `newsletter`, `marquee`, `usp-bar`, `rich-text`,
`related-products` — all with presets, so they can be added to any page.

---

## Theme settings

Colours, typography, page width, grid gap, section spacing, product image
ratio, corner radius, card behaviour (hover image, quick add, swatches, sizes
on hover, badges), cart type and free-shipping threshold, social links, and
animation toggles are all in **Theme settings**. Nothing about the look is
locked in code.

---

## Notes

- `base.css` and `theme.js` are plain CSS/JS with no build step and no
  dependencies. Edit them directly.
- The theme is progressive: filtering, cart updates and search all work without
  JavaScript (full page loads), and are upgraded to fetch-based updates when JS
  runs.
- `theme.js` uses the Section Rendering API for cart updates, so the drawer,
  header count and cart page all stay in sync from one request.
