# Test fixture

A small invented website in the shape of `data/v2/`, for the tests: the
content checks mutate copies of it (`tests/content.test.ts`) and the build
checks build it with `WEBSITE_DATA` (`tests/build.test.ts`). It stays the same
when a module replaces the example content of `data/v2/`. It has a page for
each list, no services (an empty collection) and one news item that is a draft
(so the news list is empty too).
