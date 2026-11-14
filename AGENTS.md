
- Public supplier links use `linkFornecedor()` (slug, falling back to id); `/fornecedor/:id` accepts both so old links keep working.
- Only couple accounts may own a `couples` row (DB trigger); route guards wait for the profile before deciding account type.
- Render platform branding through the shared BrandLogo component with light-background and dark-background assets so identity remains consistent and readable across screens.
- Duplicate categories through the admin-only atomic RPC, including field definitions but never supplier records or answers, to prevent incomplete copies and unauthorized writes.
- Referral tables are owner/admin-only; validate public codes through bounded RPCs, exposing names only for public couple profiles, to avoid bulk disclosure.
- Public staff reviews must belong to public professional profiles; private reviews remain visible to participants/admins, to respect profile privacy.
- Public supplier-file reads require an exact visible attachment record for an approved non-demo supplier; internal and unregistered files stay private.
- Resolve the current professional landing configuration through a fixed-search-path definer helper, to avoid recursive RLS while excluding older configuration records.
