# Roo-Code Git Workflow Instructions

## Purpose
This document outlines the Git workflow to be followed when making changes to the workspace using Roo-code. The workflow ensures systematic task tracking, version control, and error handling.

## Workflow Steps

### 1. TODO List Management
- **Always start** changes by updating the TODO list using the `update_todo_list` tool.
- Mark tasks as completed (`[x]`) as they are finished.
- Keep the TODO list updated to reflect current progress.

### 2. Initial Commit
- **At the start** of a set of tasks (for one user prompt), create an initial Git commit.
- Use a descriptive commit message that summarizes the task set.
- Example: `git commit -m "Start: [brief description of tasks]"`

### 3. Amendment Process
- **For every task** in the TODO list that gets completed, amend the previous commit with the new changes.
- Use `git commit --amend` to add changes to the last commit.
- Ensure the commit message is updated if needed to reflect the progress.
- Example: After completing a task, run `git add . && git commit --amend --no-edit` to amend without changing the message.

### 4. Error Handling
- **If amend fails** (e.g., due to merge conflicts or other issues), stop the progress immediately.
- **Inform the user** about the failure and do not proceed until resolved.
- Resolve any conflicts manually before continuing.

## Example Workflow

```bash
# Start with updating TODO list
# [Use update_todo_list tool to mark tasks]

# Make initial commit
git add .
git commit -m "Start: Implement market data integration"

# After completing first task
git add .
git commit --amend --no-edit

# After completing second task
git add .
git commit --amend --no-edit

# Continue for each task completion
```

## Best Practices
- **Frequent Amendments**: Amend commits after each task completion to keep history clean.
- **Descriptive Messages**: Use clear commit messages to track progress.
- **Error Awareness**: Always check for amend failures and address them promptly.

## Integration with Roo-Code
- Use the `update_todo_list` tool to manage task status.
- Follow this workflow for all changes to maintain consistency.
- Refer to this document for any questions about the Git process.
- Keep the repository-level [`todo.md`](todo.md:1) file updated after each meaningful set of tasks; ensure it mirrors the `update_todo_list` state and is committed following the Roo-Code Git workflow.

Last Updated: 2025-09-29