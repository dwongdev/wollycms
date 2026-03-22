---
title: Content Workflows
description: Configure custom content stages with role-based transitions — Draft → In Review → Approved → Published.
---

WollyCMS supports configurable content workflows. By default, pages move between **Draft**, **Published**, and **Archived**. You can add custom stages in between (e.g., "In Review", "Approved") with role requirements for each transition.

## Default workflow

Out of the box, pages have three statuses:

```
Draft → Published → Archived
  ↑                    |
  └────────────────────┘
```

Any editor can publish or archive. This is the same behavior WollyCMS has always had.

## Custom workflow stages

Go to **System → Settings → Workflow** to add stages. For example, a content review workflow:

```
Draft → In Review → Approved → Published → Archived
  ↑         |          |                       |
  ←─────────←──────────←───────────────────────┘
```

Each stage defines:
- **Slug** — machine name (e.g., `in_review`)
- **Label** — display name (e.g., "In Review")
- **Color** — badge color in the admin UI
- **Required Role** — minimum role to transition TO this stage (e.g., only admins can approve)
- **Transitions** — which stages this stage can move to

## How transitions work

When an editor changes a page's status, WollyCMS validates:

1. **Is the transition allowed?** — The current stage must list the target stage in its `transitions` array.
2. **Does the user have the required role?** — If the target stage has a `requiredRole`, the user must have that role or higher (viewer < editor < admin).

If either check fails, the status change is rejected with an error message.

## Page editor behavior

The page editor header shows transition buttons based on the current stage's allowed transitions. For example, if a page is "In Review", the editor sees buttons for "Approved" and "Draft" (but not "Published" directly, unless the workflow allows it).

The "Publish" button is highlighted as the primary action. Other transitions show as outline buttons.

## Example: Editorial review workflow

Configure these stages in Settings:

| Slug | Label | Color | Required Role | Transitions |
|---|---|---|---|---|
| `draft` | Draft | yellow | Any | `in_review`, `published` |
| `in_review` | In Review | blue | Editor | `approved`, `draft` |
| `approved` | Approved | purple | Admin | `published`, `draft` |
| `published` | Published | green | Admin | `draft`, `archived` |
| `archived` | Archived | gray | Any | `draft` |

With this config:
- Editors can submit for review (draft → in_review) and send back to draft
- Only admins can approve (in_review → approved)
- Only admins can publish (approved → published)
- Anyone can archive and unarchive

## API

Status changes happen through the normal page update endpoint:

```
PUT /api/admin/pages/:id
{ "status": "in_review" }
```

The server validates the transition against the workflow config. Invalid transitions return a `400` error with code `WORKFLOW`.

The workflow configuration is available via the config API:

```
GET /api/admin/config
// Response includes: workflow.stages[]
```

## Notes

- **"draft" and "published" are required** — every workflow must include these two stages. They're how WollyCMS determines what content is live.
- **The content API always filters by `status = 'published'`** — custom intermediate stages (in_review, approved) are only visible in the admin API.
- **Backward compatible** — if no custom stages are configured, the default draft/published/archived workflow applies.
- **Lifecycle hooks** integrate with workflows — `beforePublish` fires when transitioning to "published" regardless of which stage it came from.
