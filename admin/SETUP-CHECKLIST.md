# Netlify Identity + Git Gateway — Setup Checklist

Site: **o-jah.org** · Admin UI: **admin.o-jah.org** · Free Netlify tier · 3 invite-only seats.
Content lives only in `content/reports.json`, `content/stories.json`, `content/featured.json`;
`node build.js` regenerates `dist/`.

**Roles**

| Role | Permissions | Assigned to |
|---|---|---|
| `content-admin` | Full CRUD over Reports, Stories, Homepage Featured | Admin (2 people) |
| `superadmin` | Everything in `content-admin` **plus** Netlify Identity user management (invite/remove users, assign roles) | Superadmin (1 person) |

## 0. Prerequisites

1. Repository hosted on GitHub (or GitLab/Bitbucket) with `content/*.json`, `build.js`, and `admin/config.yml` committed.
2. A free Netlify account with access to create a site.

## 1. Deploy the site and set the build

3. In Netlify: **Add new site → Import an existing project** and select the repo.
4. Set the build settings:
   - **Build command:** `node build.js`
   - **Publish directory:** `dist`
   - **Branch:** `main` (must match `backend.branch` in `config.yml`)
5. Add the custom domain **o-jah.org** and subdomain **admin.o-jah.org** (Netlify DNS or your DNS provider).

## 2. Serve the Decap admin UI on admin.o-jah.org

6. Create `admin/index.html` (snippet below) — it loads Decap CMS, `/admin/config.yml`, and the Netlify Identity widget.
7. Point **admin.o-jah.org** at the `admin/` folder (or a redirect to `o-jah.org/admin/`).

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OJAH Content Manager</title>
</head>
<body>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
  <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
  <script>
    if (window.netlifyIdentity) {
      window.netlifyIdentity.on("init", function (user) {
        if (!user) {
          window.netlifyIdentity.on("login", function () {
            document.location.href = "/admin/";
          });
        }
      });
    }
  </script>
</body>
</html>
```

## 3. Enable Netlify Identity (invite-only)

8. Netlify dashboard → **Identity → Enable Identity**.
9. **Identity → Settings & usage → Registration → Invite only** (turn off open registration).
   This enforces **no public signup** and keeps the site at **3 seats**.

## 4. Enable Git Gateway

10. **Identity → Services → Enable Git Gateway** (free tier). This bridges Netlify Identity
    logins to commits on the repo, so CMS saves write back to `content/*.json`.
11. Confirm the gateway is enabled for the production branch (`main`).

## 5. Invite the 3 named users with roles

12. **Identity → Invite users**, then invite and set each user's `app_metadata.roles`:

| # | Name | Email (replace with the real address) | Roles |
|---|---|---|---|
| 1 | Superadmin | `superadmin@o-jah.org` | `["superadmin"]` |
| 2 | Admin | `admin1@o-jah.org` | `["content-admin"]` |
| 3 | Admin | `admin2@o-jah.org` | `["content-admin"]` |

13. Give the **Superadmin only** Netlify **team/dashboard access** (site owner or an
    "admin" team member) so they can manage Identity users. The two Admins stay
    **Identity-only** users — they get content CRUD but cannot manage users.

> Note: on the free-tier hosted Git Gateway, any invited Identity user can commit.
> The `content-admin` / `superadmin` split is therefore enforced by Netlify Identity
> membership itself — only the 3 invited users exist, and only the Superadmin has
> dashboard access to invite/remove users.

## 6. Verify

14. Log in at **admin.o-jah.org** as each of the 3 users and confirm Reports, Stories,
    and Homepage Featured are editable; a save produces a commit to `content/*.json`.
15. Confirm the **Superadmin** can invite/remove users and change roles; confirm the
    two **Admins** cannot reach Identity user management.
16. Confirm open registration is disabled (no public signup path exists).
17. After any content change, confirm the Netlify build runs `node build.js` and the
    updated `dist/` is deployed.
