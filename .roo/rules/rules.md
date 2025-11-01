# Roo-Code Git Workflow Instructions

## Purpose
This document outlines the Git workflow to be followed when making changes to the workspace using Roo-code. The workflow ensures systematic task tracking, version control, and error handling.

## Workflow Steps

### 1. Agent Workflow and Planning Cycle

- **Start in Architect Mode:** All user prompts must begin in `architect` mode. This is the designated starting point for planning and task breakdown.

- **Architect Mode Responsibilities:**
    - Analyze the user prompt to understand the core request.
    - Review existing context from the [`docs/archDecisions`](docs/archDecisions) folder and the repository-level [`todo.md`](todo.md:1).
    - Synthesize this information to create a detailed action plan.
    - Use the `update_todo_list` tool to outline the plan.
    - Once the plan is approved, switch to the appropriate agent mode (e.g., `code`, `debug`) to execute the first task.

- **Task Execution and Return to Architect:**
    - The assigned agent executes its designated task.
    - Upon task completion, the agent **must** switch back to `architect` mode.
    - The `architect` agent then reviews progress, updates the [`todo.md`](todo.md:1), and plans the next step, ensuring a continuous planning and execution cycle.

### 2. Commit at completion
- **At the end** of a logical set of tasks for a single user prompt, create a Git commit summarizing the completed work.
- Use a descriptive commit message that summarizes the tasks completed and the rationale.
- If an intermediate WIP commit is required for a long-running or interactive task, clearly label it as WIP and prefer to squash or amend it into the final commit when the set is complete.

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
# 1) Switch to the correct Roo agent mode (architect/code/debug/ask/orchestrator)
#    [Use the switch_mode tool to set the mode before analysis or file edits]
#
# 2) Check repository-level todo.md to understand current context and chosen plan
#    [Read [`todo.md`](todo.md:1) or confirm update_todo_list state]
#
# 3) Update the TODO list with any immediate actions (use update_todo_list)
#
# 4) Implement the planned tasks. For each task:
#      - Perform the work
#      - Mark the task completed in update_todo_list
#      - At the end of each completed or failed task, Roo must give the user actionable bash instructions for any next steps they must perform manually (such as account setup, credential creation, or follow-up actions).
#
# 5) When the set of logical tasks for this prompt is complete, create the commit:
git add .
git commit -m "Complete: Implement market data integration"
#
# 6) If you created interim WIP commits, squash or amend them into the final commit as needed
```

## Best Practices
- **Frequent Amendments**: Amend commits after each task completion to keep history clean.
- **Descriptive Messages**: Use clear commit messages to track progress.
- **Error Awareness**: Always check for amend failures and address them promptly.

## Additional User Instruction Policy

- Roo code agents **must always automatically open the browser and check any relevant UI/pages to validate the effects of changes whenever it is appropriate, never asking or instructing the user to do this manually**. For example, after making any code or environment changes that could affect the UI, Roo agents must open http://localhost:3000, programmatically verify that the expected pages load correctly, and ensure there are no visible errors—doing this as part of every workflow, not just as a suggestion or optional step.
- After browser-based validation, Roo **must provide clear, practical, and actionable instructions telling the user exactly what they should do next** (if any). This includes bash commands if any manual or follow-up actions are needed outside Roo's scope.
- If shell or terminal instructions are ever given, always assume the user shell is **bash** (not Windows CMD or PowerShell) for all command-line workflow examples and automation instructions, regardless of OS context.

## Integration with Roo-Code
- Use the `update_todo_list` tool to manage task status.
- Follow this workflow for all changes to maintain consistency.
- Refer to this document for any questions about the Git process.
- Keep the repository-level [`todo.md`](todo.md:1) file updated after each meaningful set of tasks; ensure it mirrors the `update_todo_list` state. Create a single, descriptive Git commit at the end of each logical set of tasks to capture the completed work.

Last Updated: 2025-10-28