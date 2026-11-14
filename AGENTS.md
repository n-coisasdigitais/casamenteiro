
- Public supplier links use `linkFornecedor()` (slug, falling back to id); `/fornecedor/:id` accepts both so old links keep working.
- Only couple accounts may own a `couples` row (DB trigger); route guards wait for the profile before deciding account type.
- Render platform branding through the shared BrandLogo component with light-background and dark-background assets so identity remains consistent and readable across screens.
- Duplicate categories through the admin-only atomic RPC, including field definitions but never supplier records or answers, to prevent incomplete copies and unauthorized writes.
