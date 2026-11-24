# Design History

A record of each visual design, so an earlier one can be restored on request. The code for each version is in the commit listed. Restore it with `git show <commit>:<path>` or `git checkout <commit> -- <path>`.

## Version 3: Sign-in showcase and grouped navigation (2026-11-25, current)

**Code:** the commit that introduces this entry, in `src/pages/LoginPage.tsx`, `src/layout/AppLayout.tsx`, `src/components/BrandMark.tsx`, `src/components/UserMenu.tsx`, `src/components/PageHeader.tsx`, and `src/theme/`.

- **Sign-in page.**
  - A full-page backdrop: two soft brand and violet glows over a faint dot grid that fades towards the bottom. The brand mark sits top left and the theme toggle top right.
  - From `md` up, the left column has a "Built for HR teams" badge, the headline "Every salary, every country, one clear picture." with a gradient on the last phrase, a description, three checkmarked highlights, and a decorative preview card with illustrative median bars and three stats.
  - The right column is a large rounded card: "Sign in", email and password fields with icons, and the button. Below an "or try the demo" divider, the built-in demo account shows with copy buttons and a one-click "Sign in with the demo account" button.
- **App shell.**
  - The navigation is grouped under **Workspace** (Employees, Analytics, Import and export) and **Administration** (Settings, HR users), on a slightly lighter sidebar.
  - The header has the brand mark, the theme toggle, and an account menu (avatar, name, and email, opening to HR users and Sign out). This replaces the account card and the separate sign-out button.
- **Pages.** Every page header has an icon tile beside the title. A new HR users page has a table of users and an add-user dialog.
- **Refinements (2026-11-25).**
  - The sign-in page fits the screen height (`100dvh`, no page scroll), and the sign-in card has `md` corners.
  - The radius scale is slightly smaller (md 7 px, lg 13 px, xl 26 px, down from 8, 16, and 32).
  - The Employees page has a Table/Cards toggle above the list (table by default, remembered per browser).
  - The pay band column keeps its width, with a placeholder while loading and a dash within the band.
- The font, palette, and shadows are unchanged from version 2.

## Version 2: Indigo-violet with Plus Jakarta Sans (2026-11-24)

**Code:** commit `0ec7a70`, folder `apps/web/src` (before the rename to `apps/frontend`). The design files are `theme.ts`, `styles.css`, `layout/AppLayout.tsx`, `pages/LoginPage.tsx`, `components/PageHeader.tsx`, and `components/MedianBars.tsx`.

**Theme**

- Font: Plus Jakarta Sans (variable, bundled with Fontsource). Headings weight 700 with -0.02em tracking. Tabular figures in table cells and badges.
- Accent: a custom `brand` palette, indigo leaning violet (`#5b61ef` at shade 6). Primary shade 6 in light mode and 5 in dark mode.
- Dark mode: blue-tinted greys (`#0c0d21` to `#d5d7e0`).
- Page background: `#f6f7fb` in light mode and `dark[8]` in dark mode. Cards are white or `dark[7]`, with radius `lg`, a border, and a soft `xs` shadow.
- Badges in sentence case, semi-bold buttons, and table headers uppercase on a tinted row.
- Header: translucent, with `backdrop-filter: blur(10px)`.

**App shell**

- A 64 px header with the brand mark on the left (gradient icon, "Salary Management", and "ACME People" beneath). On the right, a light/dark toggle and a sign-out icon button.
- A 248 px navigation bar with a "Workspace" label and four links with icons: Employees, Analytics, Import and export, Settings. The links use the light variant with rounded corners.
- An account card at the foot of the navigation shows the avatar initials, "HR Manager", and the email.

**Sign-in page**

- Two columns from the `md` breakpoint. On the left, a brand panel: a brand-to-violet gradient with a soft radial highlight, the headline "Pay decisions, without the spreadsheets.", a short description, and three highlights with icons.
- On the right: the theme toggle, the brand mark, and a "Welcome back" card with email, password, and a full-width Sign in button. Below it, a "Demo account" card shows the email and password with copy buttons and a "Use demo account" button.

**Pages**

- Each page starts with a shared header: title, description, and actions on the right.
- Analytics: five stat cards (Headcount, Median, Average, Lowest, Highest), each with an icon. Gradient median bars, a grouped table, and a paged out-of-band list with a Below/Above segmented filter.
- Employees: filters and table in one card, with avatar initials, the email under the name, and level and band badges.
- Employee profile: a header card with a large avatar.

## Version 1: First Mantine theme (2026-11-24)

**Code:** commit `0592594` (`feat(web): modern theme with light and dark mode`). Inter font, stock Mantine indigo, and the signed-in email in the header.
