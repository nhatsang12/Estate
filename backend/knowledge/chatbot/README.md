# Chatbot Knowledge Base

This folder is the single source of truth for chatbot knowledge.

## Files

- `property_type_mappings.md`:
  Property type alias mapping used by query understanding.
- `amenity_aliases.md`:
  Amenity alias mapping used by query understanding.
- `web_navigation_guide.md`:
  Long-form navigation guide parsed into searchable sections.
- `route_knowledge.md`:
  Structured route knowledge (`route`, `title`, `summary`, `keywords`, `steps`).
- `common_workflows.md`:
  Structured workflow guidance with route references.
- `advisory_playbook.md`:
  Advisory keywords and consultation question templates.
- `legal_checklist.md`:
  Legal keywords, risk keywords, and legal due-diligence checklist.

## Optional override

Set `CHATBOT_KB_DIR` in backend `.env` to point to a custom folder with the same filenames.

