# AI Rules

INSTRUCTIONS IN THIS FILE ARE EXTREMELY IMPORTANT TO FOLLOW

## CRITICAL DEVELOPMENT RULES

**NEVER run `npx` !**
**NEVER assume the user wants to test the application immediately after implementation.**
**ALWAYS follow the established patterns in the codebase.**
**ALWAYS check TypeScript compilation before asking to test.**
**ALWAYS provide a short summary of what was implemented.**
**NEVER start servers or run applications without explicit user permission.**
**NEVER change git. Reading is okay, writing is never ok.**
**When debugging, prefer to analyze code and logs and targeted test files.**

## Development Workflow

You are free to run `node_modules/.bin/tsc` for type checking. You can use it with `--noUnusedParameters --noEmit` or `--noUnusedLocals --noEmit` to clean up.

- Follow existing patterns in the code base
- Write simple easy to maintain code, don't try to be smart about it
- Minimal depdendencies. Only in extreme cases are dependencies okay and consider that there's currently only the stockfish engine that's a dependency
- Vanilla TypeScript, CSS, HTML. No React or anything like that.
- Do not use classes, generators (async is fine when it makes sense), dynamic imports (always use static imports instead), star exports, star imports
- Modularized code. Try to reuse abstract code in utils
- Everything must be strictly typed. No `any`. Only use `unknown` and casting when absolutely necessary, like log abstractions or getting dom elements
- Code must be maintainable, easy to follow. Add comments where it makes sense. Don't add redundant comments.
- Use `console.log` when debugging. REMOVE LOGGING when you have what you needed from it and moving on to next step of debuggging. Logs are very expensive so be mindful of that.
- Before adding more logging, consider whether you need it, or if you can just fix the problem without more logging. Logging is expensive.
- Do NOT use `log()`. That is for the human.
- When using try/catch, always _at least_ log a warning for the catch. Don't squash errors!
- Be very explicit in naming things. Make them greppable. Namespace CSS classes and element IDs such that it's unambiguous and easy to search for.
- Prefer to find elements by ID's over classes and only use querySelector when it makes sense to do so.

INSTRUCTIONS IN THIS FILE ARE EXTREMELY IMPORTANT TO FOLLOW
