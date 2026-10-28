
- Public supplier links use `linkFornecedor()` (slug, falling back to id); `/fornecedor/:id` accepts both so old links keep working.
- Only couple accounts may own a `couples` row (DB trigger); route guards wait for the profile before deciding account type.
