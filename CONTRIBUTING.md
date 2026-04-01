# Contributing to MCP Playground

Thanks for your interest in contributing! Here's how to get involved.

## Reporting Issues

- Search [existing issues](https://github.com/JoseMiguez98/mcp-playground/issues) before opening a new one.
- Include steps to reproduce, expected vs. actual behavior, and your environment (OS, Node.js version).

## Submitting Pull Requests

1. Fork the repo and create a branch from `main`.
2. Install dependencies:
   ```bash
   npm install
   npm --prefix client install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Make your changes and test them locally.
5. Open a pull request with a clear description of what you changed and why.

## Code Style

- TypeScript for both server and client.
- Keep changes focused — one PR per feature or fix.
- If adding a new feature, update the README if relevant.

## Ideas for Contributions

- UI improvements or new views (e.g., request/response history)
- Support for additional MCP transport types
- Better error handling and display
- Tests

All contributions — big or small — are welcome. Thank you!
